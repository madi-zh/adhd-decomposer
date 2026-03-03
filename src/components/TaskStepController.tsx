"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import StepCard from "@/components/StepCard";
import ProgressBar from "@/components/ProgressBar";
import FocusRoomInvite from "@/components/FocusRoomInvite";

const Celebration = dynamic(() => import("@/components/Celebration"), {
  ssr: false,
});

const FocusRoomPresenceBar = dynamic(
  () => import("@/components/FocusRoomPresenceBar"),
  { ssr: false }
);

interface Step {
  id: string;
  content: string;
  isCompleted: boolean;
}

interface Task {
  title: string;
  steps: Step[];
}

type Phase = "focus-room-invite" | "steps";

export default function TaskStepController({
  task: initialTask,
  initialFocusCount = 0,
  taskId,
}: {
  task: Task;
  initialFocusCount?: number;
  taskId?: string;
}) {
  const [steps, setSteps] = useState(initialTask.steps);
  const [isCompleting, setIsCompleting] = useState(false);
  const [error, setError] = useState("");
  const [phase, setPhase] = useState<Phase>("focus-room-invite");
  const [focusRoom, setFocusRoom] = useState<{ presenceId: string } | null>(
    null
  );

  let completedCount = 0;
  let currentStep: Step | undefined;

  for (const s of steps) {
    if (s.isCompleted) {
      completedCount++;
    } else if (!currentStep) {
      currentStep = s;
    }
  }

  const handleJoinFocusRoom = useCallback(async () => {
    try {
      const res = await fetch("/api/focus-room/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId }),
      });
      if (res.ok) {
        const data = await res.json();
        setFocusRoom({ presenceId: data.presenceId });
      }
    } catch {
      // If join fails, just proceed to steps
    }
    setPhase("steps");
  }, [taskId]);

  const handleSkipFocusRoom = useCallback(() => {
    setPhase("steps");
  }, []);

  if (!currentStep) {
    return <Celebration taskTitle={initialTask.title} />;
  }

  if (phase === "focus-room-invite") {
    return (
      <FocusRoomInvite
        activeCount={initialFocusCount}
        onJoin={handleJoinFocusRoom}
        onSkip={handleSkipFocusRoom}
      />
    );
  }

  const activeStep = currentStep;

  async function handleComplete() {
    if (isCompleting) return;
    setIsCompleting(true);
    setError("");

    // Optimistic UI: advance immediately
    setSteps((prev) =>
      prev.map((s) =>
        s.id === activeStep.id ? { ...s, isCompleted: true } : s
      )
    );

    try {
      const res = await fetch(`/api/steps/${activeStep.id}`, {
        method: "PATCH",
      });
      if (!res.ok) throw new Error();
    } catch {
      // Revert on failure
      setSteps((prev) =>
        prev.map((s) =>
          s.id === activeStep.id ? { ...s, isCompleted: false } : s
        )
      );
      setError("Could not save progress. Please try again.");
    } finally {
      setIsCompleting(false);
    }
  }

  return (
    <div className="pt-8">
      <h2 className="text-lg font-medium text-stone-600 text-center mb-8">
        {initialTask.title}
      </h2>

      {focusRoom && (
        <FocusRoomPresenceBar
          presenceId={focusRoom.presenceId}
          currentStepContent={activeStep.content.slice(0, 50)}
        />
      )}

      <div className="mb-10">
        <ProgressBar completed={completedCount} total={steps.length} />
      </div>

      {error && (
        <p role="alert" className="text-red-500 text-sm text-center mb-4">
          {error}
        </p>
      )}

      <StepCard
        content={activeStep.content}
        stepNumber={completedCount + 1}
        total={steps.length}
        onComplete={handleComplete}
        isCompleting={isCompleting}
      />
    </div>
  );
}

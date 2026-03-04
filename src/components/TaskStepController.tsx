"use client";

import { useState, useCallback, useMemo } from "react";
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

const MicroRegulation = dynamic(
  () => import("@/components/MicroRegulation"),
  { ssr: false }
);

const MoodCheckIn = dynamic(
  () => import("@/components/MoodCheckIn"),
  { ssr: false }
);

interface Step {
  id: string;
  content: string;
  isCompleted: boolean;
}

interface ExistingMoodCheckIn {
  mood: string;
  timing: string;
}

interface Task {
  id: string;
  title: string;
  steps: Step[];
  moodCheckIns?: ExistingMoodCheckIn[];
}

type Phase = "focus-room-invite" | "mood-before" | "regulation" | "steps" | "mood-after" | "celebration";

const DISTRESSED_MOODS = ["anxious", "frustrated", "tired"];

function getInitialPhase(moodCheckIns?: ExistingMoodCheckIn[], allStepsComplete?: boolean): Phase {
  const hasBefore = moodCheckIns?.some((m) => m.timing === "before");
  const hasAfter = moodCheckIns?.some((m) => m.timing === "after");

  if (allStepsComplete) {
    return hasAfter ? "celebration" : "mood-after";
  }
  // If they already did a before check-in, go straight to steps (skip focus room invite too)
  if (hasBefore) return "steps";
  // Otherwise start with focus room invite
  return "focus-room-invite";
}

export default function TaskStepController({
  task: initialTask,
  initialFocusCount = 0,
}: {
  task: Task;
  initialFocusCount?: number;
}) {
  const [steps, setSteps] = useState(initialTask.steps);
  const [isCompleting, setIsCompleting] = useState(false);
  const [error, setError] = useState("");
  const [focusRoom, setFocusRoom] = useState<{ presenceId: string } | null>(
    null
  );

  const allStepsComplete = steps.every((s) => s.isCompleted);
  const existingBeforeMood = initialTask.moodCheckIns?.find((m) => m.timing === "before")?.mood ?? null;

  const [phase, setPhase] = useState<Phase>(() =>
    getInitialPhase(initialTask.moodCheckIns, allStepsComplete)
  );
  const [moodBefore, setMoodBefore] = useState<string | null>(existingBeforeMood);
  const [moodAfter, setMoodAfter] = useState<string | null>(
    initialTask.moodCheckIns?.find((m) => m.timing === "after")?.mood ?? null
  );

  const { completedCount, currentStep } = useMemo(() => {
    let completed = 0;
    let current: Step | undefined;

    for (const s of steps) {
      if (s.isCompleted) {
        completed++;
      } else if (!current) {
        current = s;
      }
    }
    return { completedCount: completed, currentStep: current };
  }, [steps]);

  const handleJoinFocusRoom = useCallback(async () => {
    try {
      const res = await fetch("/api/focus-room/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId: initialTask.id }),
      });
      if (res.ok) {
        const data = await res.json();
        setFocusRoom({ presenceId: data.presenceId });
      }
    } catch {
      // If join fails, just proceed
    }
    setPhase("mood-before");
  }, [initialTask.id]);

  const handleSkipFocusRoom = useCallback(() => {
    setPhase("mood-before");
  }, []);

  const handleMoodBeforeComplete = useCallback((mood: string) => {
    setMoodBefore(mood);
    if (DISTRESSED_MOODS.includes(mood)) {
      setPhase("regulation");
    } else {
      setPhase("steps");
    }
  }, []);

  const handleMoodBeforeSkip = useCallback(() => {
    setPhase("steps");
  }, []);

  const handleRegulationDone = useCallback(() => {
    setPhase("steps");
  }, []);

  const handleMoodAfterComplete = useCallback((mood: string) => {
    setMoodAfter(mood);
    setPhase("celebration");
  }, []);

  const handleMoodAfterSkip = useCallback(() => {
    setPhase("celebration");
  }, []);

  async function handleStepComplete() {
    if (isCompleting || !currentStep) return;
    const activeStep = currentStep;
    // Capture before optimistic update — if only 1 incomplete, this is the last step
    const isLastStep = steps.filter((s) => !s.isCompleted).length === 1;

    setIsCompleting(true);
    setError("");

    // Optimistic UI: advance immediately
    setSteps((prev) =>
      prev.map((s) =>
        s.id === activeStep.id ? { ...s, isCompleted: true } : s
      )
    );

    if (isLastStep) {
      setPhase("mood-after");
    }

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
      if (isLastStep) {
        setPhase("steps");
      }
      setError("Could not save progress. Please try again.");
    } finally {
      setIsCompleting(false);
    }
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

  if (phase === "mood-before") {
    return (
      <MoodCheckIn
        taskId={initialTask.id}
        timing="before"
        onComplete={handleMoodBeforeComplete}
        onSkip={handleMoodBeforeSkip}
      />
    );
  }

  if (phase === "regulation" && moodBefore && DISTRESSED_MOODS.includes(moodBefore)) {
    return (
      <MicroRegulation
        mood={moodBefore as "anxious" | "frustrated" | "tired"}
        onComplete={handleRegulationDone}
        onSkip={handleRegulationDone}
      />
    );
  }

  if (phase === "mood-after") {
    return (
      <MoodCheckIn
        taskId={initialTask.id}
        timing="after"
        onComplete={handleMoodAfterComplete}
        onSkip={handleMoodAfterSkip}
      />
    );
  }

  if (phase === "celebration" || (!currentStep && phase === "steps")) {
    return (
      <Celebration
        taskTitle={initialTask.title}
        moodBefore={moodBefore}
        moodAfter={moodAfter}
      />
    );
  }

  return (
    <div className="pt-8">
      <h2 className="text-lg font-medium text-stone-600 text-center mb-8">
        {initialTask.title}
      </h2>

      {focusRoom && (
        <FocusRoomPresenceBar
          presenceId={focusRoom.presenceId}
          currentStepContent={currentStep!.content.slice(0, 50)}
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
        content={currentStep!.content}
        stepNumber={completedCount + 1}
        total={steps.length}
        onComplete={handleStepComplete}
        isCompleting={isCompleting}
      />
    </div>
  );
}

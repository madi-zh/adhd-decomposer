"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import StepCard from "@/components/StepCard";
import ProgressBar from "@/components/ProgressBar";
import DeadlinePicker from "@/components/DeadlinePicker";
import UrgencyGradient from "@/components/UrgencyGradient";

const Celebration = dynamic(() => import("@/components/Celebration"), {
  ssr: false,
});

interface Step {
  id: string;
  content: string;
  isCompleted: boolean;
}

interface Task {
  id: string;
  title: string;
  steps: Step[];
  createdAt: string;
  deadline?: string | null;
  confettiColors?: string[];
  xpAwarded?: number;
}

export default function TaskStepController({ task: initialTask }: { task: Task }) {
  const [steps, setSteps] = useState(initialTask.steps);
  const [isCompleting, setIsCompleting] = useState(false);
  const [error, setError] = useState("");
  const [deadline, setDeadline] = useState<string | null>(
    initialTask.deadline ?? null
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

  if (!currentStep) {
    return (
      <Celebration
        taskTitle={initialTask.title}
        confettiColors={initialTask.confettiColors}
        xpAwarded={initialTask.xpAwarded}
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
      const res = await fetch(`/api/steps/${activeStep.id}`, { method: "PATCH" });
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

  const stepCard = (
    <StepCard
      content={activeStep.content}
      stepNumber={completedCount + 1}
      total={steps.length}
      onComplete={handleComplete}
      isCompleting={isCompleting}
    />
  );

  return (
    <div className="pt-8">
      <h2 className="text-lg font-medium text-stone-600 text-center mb-4">
        {initialTask.title}
      </h2>

      {!deadline && (
        <div className="text-center mb-4">
          <DeadlinePicker
            taskId={initialTask.id}
            onDeadlineSet={(d) => setDeadline(d)}
          />
        </div>
      )}

      <div className="mb-10">
        <ProgressBar completed={completedCount} total={steps.length} />
      </div>

      {error && (
        <p role="alert" className="text-red-500 text-sm text-center mb-4">
          {error}
        </p>
      )}

      {deadline ? (
        <UrgencyGradient deadline={deadline} createdAt={initialTask.createdAt}>
          {stepCard}
        </UrgencyGradient>
      ) : (
        stepCard
      )}
    </div>
  );
}

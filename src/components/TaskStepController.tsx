"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import StepCard from "@/components/StepCard";
import ProgressBar from "@/components/ProgressBar";
import TimeEstimatePrompt from "@/components/TimeEstimatePrompt";
import AmbientTimer from "@/components/AmbientTimer";

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
}

interface TimeEstimateData {
  estimateMinutes: number;
  startedAt: string;
  completedAt: string | null;
  actualMinutes: number | null;
}

export default function TaskStepController({
  task: initialTask,
  timeEstimate: initialEstimate,
}: {
  task: Task;
  timeEstimate: TimeEstimateData | null;
}) {
  const [steps, setSteps] = useState(initialTask.steps);
  const [isCompleting, setIsCompleting] = useState(false);
  const [error, setError] = useState("");
  const [estimate, setEstimate] = useState<{
    estimateMinutes: number;
    startedAt: string;
  } | null>(
    initialEstimate
      ? {
          estimateMinutes: initialEstimate.estimateMinutes,
          startedAt: initialEstimate.startedAt,
        }
      : null
  );
  const [skippedEstimate, setSkippedEstimate] = useState(false);

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
    const timeData =
      initialEstimate?.actualMinutes != null
        ? {
            estimateMinutes: initialEstimate.estimateMinutes,
            actualMinutes: initialEstimate.actualMinutes,
          }
        : null;
    return (
      <Celebration taskTitle={initialTask.title} timeEstimate={timeData} />
    );
  }

  // Show estimate prompt if no estimate set and user hasn't skipped
  if (!estimate && !skippedEstimate) {
    return (
      <TimeEstimatePrompt
        taskId={initialTask.id}
        taskTitle={initialTask.title}
        stepCount={steps.length}
        onEstimateSet={(estimateMinutes, startedAt) =>
          setEstimate({ estimateMinutes, startedAt })
        }
        onSkip={() => setSkippedEstimate(true)}
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

      {estimate ? (
        <AmbientTimer
          startedAt={estimate.startedAt}
          estimateMinutes={estimate.estimateMinutes}
        />
      ) : null}

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

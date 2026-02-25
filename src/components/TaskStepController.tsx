"use client";

import { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import StepCard from "@/components/StepCard";
import ProgressBar from "@/components/ProgressBar";
import FocusContract from "@/components/FocusContract";
import FocusTimer from "@/components/FocusTimer";

const Celebration = dynamic(() => import("@/components/Celebration"), {
  ssr: false,
});

const EveningModeOverlay = dynamic(
  () => import("@/components/EveningModeOverlay"),
  { ssr: false }
);

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

interface FocusSessionData {
  id: string;
  timeLimitMin: number;
  startedAt: string;
}

interface UserSettingsData {
  eveningCutoffHour: number;
  eveningCutoffMin: number;
  enableEveningMode: boolean;
  enableFocusTimer: boolean;
}

interface TaskStepControllerProps {
  task: Task;
  userSettings?: UserSettingsData;
  focusSession?: FocusSessionData | null;
}

export default function TaskStepController({
  task: initialTask,
  userSettings,
  focusSession: initialFocusSession,
}: TaskStepControllerProps) {
  const [steps, setSteps] = useState(initialTask.steps);
  const [isCompleting, setIsCompleting] = useState(false);
  const [error, setError] = useState("");
  const [focusSession, setFocusSession] = useState<FocusSessionData | null>(
    initialFocusSession ?? null
  );
  const [phase, setPhase] = useState<"focus-contract" | "steps">(() => {
    if (initialFocusSession) return "steps";
    if (userSettings?.enableFocusTimer) return "focus-contract";
    return "steps";
  });
  const [eveningDismissed, setEveningDismissed] = useState(false);
  const sessionIdRef = useRef(focusSession?.id ?? null);

  // Keep ref in sync
  useEffect(() => {
    sessionIdRef.current = focusSession?.id ?? null;
  }, [focusSession]);

  // End focus session on unmount via sendBeacon
  useEffect(() => {
    return () => {
      const sid = sessionIdRef.current;
      if (sid) {
        const body = JSON.stringify({ action: "end" });
        navigator.sendBeacon(
          `/api/focus-session/${sid}`,
          new Blob([body], { type: "application/json" })
        );
      }
    };
  }, []);

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
    return <Celebration taskTitle={initialTask.title} />;
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

  function handleSessionStart(session: FocusSessionData) {
    setFocusSession(session);
    setPhase("steps");
  }

  function handleSkipContract() {
    setPhase("steps");
  }

  // Focus contract phase
  if (phase === "focus-contract") {
    return (
      <FocusContract
        taskId={initialTask.id}
        taskTitle={initialTask.title}
        onSessionStart={handleSessionStart}
        onSkip={handleSkipContract}
      />
    );
  }

  // Steps phase
  return (
    <div className="pt-8">
      <h2 className="text-lg font-medium text-stone-600 text-center mb-8">
        {initialTask.title}
      </h2>

      {focusSession && (
        <FocusTimer
          sessionId={focusSession.id}
          timeLimitMin={focusSession.timeLimitMin}
          startedAt={focusSession.startedAt}
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

      {userSettings?.enableEveningMode && !eveningDismissed && (
        <EveningModeOverlay
          cutoffHour={userSettings.eveningCutoffHour}
          cutoffMin={userSettings.eveningCutoffMin}
          onDismiss={() => setEveningDismissed(true)}
        />
      )}
    </div>
  );
}

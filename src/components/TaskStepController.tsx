"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import StepCard from "@/components/StepCard";
import ProgressBar from "@/components/ProgressBar";
import ErrorAlert from "@/components/ErrorAlert";
import { DISTRESSED_MOODS, type DistressedMood } from "@/lib/moods";

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

const TimeEstimatePrompt = dynamic(
  () => import("@/components/TimeEstimatePrompt"),
  { ssr: false }
);

const AmbientTimer = dynamic(
  () => import("@/components/AmbientTimer"),
  { ssr: false }
);

const FocusRoomInvite = dynamic(
  () => import("@/components/FocusRoomInvite"),
  { ssr: false }
);

const FocusContract = dynamic(
  () => import("@/components/FocusContract"),
  { ssr: false }
);

const FocusTimer = dynamic(
  () => import("@/components/FocusTimer"),
  { ssr: false }
);

const EveningModeOverlay = dynamic(
  () => import("@/components/EveningModeOverlay"),
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

interface TimeEstimateData {
  estimateMinutes: number;
  startedAt: string;
  completedAt: string | null;
  actualMinutes: number | null;
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

type Phase =
  | "focus-room-invite"
  | "mood-before"
  | "regulation"
  | "focus-contract"
  | "time-estimate"
  | "steps"
  | "mood-after"
  | "celebration";

function getInitialPhase(
  moodCheckIns?: ExistingMoodCheckIn[],
  allStepsComplete?: boolean,
  hasTimeEstimate?: boolean,
  hasFocusSession?: boolean,
  enableFocusTimer?: boolean
): Phase {
  const hasBefore = moodCheckIns?.some((m) => m.timing === "before");
  const hasAfter = moodCheckIns?.some((m) => m.timing === "after");

  if (allStepsComplete) {
    return hasAfter ? "celebration" : "mood-after";
  }
  if (hasBefore) {
    if (hasFocusSession || !enableFocusTimer) {
      return hasTimeEstimate ? "steps" : "time-estimate";
    }
    return "focus-contract";
  }
  return "focus-room-invite";
}

export default function TaskStepController({
  task: initialTask,
  timeEstimate: initialEstimate,
  initialFocusCount = 0,
  userSettings,
  focusSession: initialFocusSession,
}: {
  task: Task;
  timeEstimate: TimeEstimateData | null;
  initialFocusCount?: number;
  userSettings?: UserSettingsData;
  focusSession?: FocusSessionData | null;
}) {
  const [steps, setSteps] = useState(initialTask.steps);
  const [isCompleting, setIsCompleting] = useState(false);
  const [error, setError] = useState("");
  const [focusRoom, setFocusRoom] = useState<{ presenceId: string } | null>(
    null
  );
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
  const [focusSession, setFocusSession] = useState<FocusSessionData | null>(
    initialFocusSession ?? null
  );
  const [eveningDismissed, setEveningDismissed] = useState(false);
  const sessionIdRef = useRef(focusSession?.id ?? null);

  // Keep ref in sync for sendBeacon cleanup
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

  const existingBeforeMood =
    initialTask.moodCheckIns?.find((m) => m.timing === "before")?.mood ?? null;

  const [phase, setPhase] = useState<Phase>(() => {
    const allComplete = initialTask.steps.every((s) => s.isCompleted);
    return getInitialPhase(
      initialTask.moodCheckIns,
      allComplete,
      !!initialEstimate,
      !!initialFocusSession,
      userSettings?.enableFocusTimer
    );
  });
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
    if ((DISTRESSED_MOODS as readonly string[]).includes(mood)) {
      setPhase("regulation");
    } else {
      setPhase("focus-contract");
    }
  }, []);

  const handleMoodBeforeSkip = useCallback(() => {
    setPhase("focus-contract");
  }, []);

  const handleRegulationDone = useCallback(() => {
    setPhase("focus-contract");
  }, []);

  const handleSessionStart = useCallback(
    (session: FocusSessionData) => {
      setFocusSession(session);
      setPhase("time-estimate");
    },
    []
  );

  const handleSkipContract = useCallback(() => {
    setPhase("time-estimate");
  }, []);

  const handleEstimateSet = useCallback(
    (estimateMinutes: number, startedAt: string) => {
      setEstimate({ estimateMinutes, startedAt });
      setPhase("steps");
    },
    []
  );

  const handleEstimateSkip = useCallback(() => {
    setSkippedEstimate(true);
    setPhase("steps");
  }, []);

  const handleMoodAfterComplete = useCallback((mood: string) => {
    setMoodAfter(mood);
    setPhase("celebration");
  }, []);

  const handleMoodAfterSkip = useCallback(() => {
    setPhase("celebration");
  }, []);

  const handleEveningDismiss = useCallback(() => {
    setEveningDismissed(true);
  }, []);

  async function handleStepComplete() {
    if (isCompleting || !currentStep) return;
    const activeStep = currentStep;
    const isLastStep = steps.length - completedCount === 1;

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

  if (
    phase === "regulation" &&
    moodBefore &&
    (DISTRESSED_MOODS as readonly string[]).includes(moodBefore)
  ) {
    return (
      <MicroRegulation
        mood={moodBefore as DistressedMood}
        onComplete={handleRegulationDone}
        onSkip={handleRegulationDone}
      />
    );
  }

  if (phase === "focus-contract" && userSettings?.enableFocusTimer && !focusSession) {
    return (
      <FocusContract
        taskId={initialTask.id}
        taskTitle={initialTask.title}
        onSessionStart={handleSessionStart}
        onSkip={handleSkipContract}
      />
    );
  }

  if (phase === "time-estimate" && !estimate && !skippedEstimate) {
    return (
      <TimeEstimatePrompt
        taskId={initialTask.id}
        taskTitle={initialTask.title}
        stepCount={steps.length}
        onEstimateSet={handleEstimateSet}
        onSkip={handleEstimateSkip}
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
    const timeData =
      initialEstimate?.actualMinutes != null
        ? {
            estimateMinutes: initialEstimate.estimateMinutes,
            actualMinutes: initialEstimate.actualMinutes,
          }
        : null;
    return (
      <Celebration
        taskTitle={initialTask.title}
        timeEstimate={timeData}
        moodBefore={moodBefore}
        moodAfter={moodAfter}
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

      {estimate ? (
        <AmbientTimer
          startedAt={estimate.startedAt}
          estimateMinutes={estimate.estimateMinutes}
        />
      ) : null}

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
        <ErrorAlert message={error} className="text-center mb-4" />
      )}

      <StepCard
        content={currentStep!.content}
        stepNumber={completedCount + 1}
        total={steps.length}
        onComplete={handleStepComplete}
        isCompleting={isCompleting}
      />

      {userSettings?.enableEveningMode && !eveningDismissed && (
        <EveningModeOverlay
          cutoffHour={userSettings.eveningCutoffHour}
          cutoffMin={userSettings.eveningCutoffMin}
          onDismiss={handleEveningDismiss}
        />
      )}
    </div>
  );
}

"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";

interface FocusTimerProps {
  sessionId: string;
  timeLimitMin: number;
  startedAt: string;
}

function formatTime(totalSeconds: number): string {
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  if (hrs > 0) {
    return `${hrs}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

function computeNudgeLevel(
  elapsedSeconds: number,
  limitSeconds: number,
  fiveMoreMinEnd: number | null
): number {
  if (fiveMoreMinEnd !== null && elapsedSeconds < fiveMoreMinEnd) {
    return 1;
  }
  const overSeconds = elapsedSeconds - limitSeconds;
  if (overSeconds >= 20 * 60) return 3;
  if (overSeconds >= 10 * 60) return 2;
  if (overSeconds >= 0) return 1;
  return 0;
}

export default function FocusTimer({
  sessionId,
  timeLimitMin,
  startedAt,
}: FocusTimerProps) {
  const router = useRouter();
  const limitSeconds = useMemo(() => timeLimitMin * 60, [timeLimitMin]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const chimeFiredRef = useRef(false);
  const nudgedLevelsRef = useRef<Set<number>>(new Set());

  const [elapsedSeconds, setElapsedSeconds] = useState(() => {
    const start = new Date(startedAt).getTime();
    return Math.max(0, Math.floor((Date.now() - start) / 1000));
  });
  const [fiveMoreMinEnd, setFiveMoreMinEnd] = useState<number | null>(null);

  // Clear expired "5 more minutes" in the tick
  const effectiveFiveMoreMinEnd =
    fiveMoreMinEnd !== null && elapsedSeconds >= fiveMoreMinEnd
      ? null
      : fiveMoreMinEnd;

  const nudgeLevel = computeNudgeLevel(elapsedSeconds, limitSeconds, effectiveFiveMoreMinEnd);

  // Preload audio on mount
  useEffect(() => {
    try {
      audioRef.current = new Audio("/sounds/chime.mp3");
      audioRef.current.volume = 0.5;
      audioRef.current.load();
    } catch {
      // Audio not supported
    }
  }, []);

  // Tick every second
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Record nudge when level changes
  const recordNudge = useCallback(
    (level: number) => {
      if (nudgedLevelsRef.current.has(level)) return;
      nudgedLevelsRef.current.add(level);
      fetch(`/api/focus-session/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "nudge" }),
      }).catch(() => {});
    },
    [sessionId]
  );

  // Play chime once when nudge reaches level 2
  useEffect(() => {
    if (nudgeLevel >= 2 && !chimeFiredRef.current && audioRef.current) {
      chimeFiredRef.current = true;
      audioRef.current.play().catch(() => {});
    }
  }, [nudgeLevel]);

  // Record nudges as they happen
  useEffect(() => {
    if (nudgeLevel >= 1) recordNudge(nudgeLevel);
  }, [nudgeLevel, recordNudge]);

  async function handleTakeBreak() {
    try {
      await fetch(`/api/focus-session/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "end" }),
      });
    } catch {
      // Best effort — session end is non-critical telemetry
    }
    router.push("/");
  }

  function handleFiveMoreMinutes() {
    setFiveMoreMinEnd(elapsedSeconds + 5 * 60);
  }

  const overMinutes = Math.floor((elapsedSeconds - limitSeconds) / 60);

  // Nudge Level 3: Full-screen overlay
  if (nudgeLevel >= 3) {
    return (
      <>
        <TimerDisplay elapsedSeconds={elapsedSeconds} nudgeLevel={0} />
        <div
          role="alertdialog"
          aria-modal="true"
          aria-label="Time to take a break"
          className="fixed inset-0 bg-stone-900/60 z-50 flex items-center justify-center"
        >
          <div className="bg-white rounded-3xl p-8 max-w-sm shadow-2xl text-center">
            <p className="text-4xl mb-4" aria-hidden="true">
              ⏰
            </p>
            <h3 className="text-xl font-semibold text-stone-800 mb-2">
              Time to take a break
            </h3>
            <p className="text-stone-500 mb-6">
              You&apos;re {overMinutes} minute{overMinutes !== 1 ? "s" : ""} past
              your limit
            </p>
            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={handleTakeBreak}
                autoFocus
                className="py-3 px-6 bg-amber-500 hover:bg-amber-600 active:bg-amber-700
                           text-white font-semibold rounded-2xl transition-all
                           hover:shadow-lg active:scale-[0.98] cursor-pointer"
              >
                Take a break
              </button>
              <button
                type="button"
                onClick={handleFiveMoreMinutes}
                className="py-2 px-6 border-2 border-stone-200 text-stone-600 font-medium
                           rounded-2xl transition-all hover:border-stone-300 cursor-pointer text-sm"
              >
                5 more minutes
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  // Nudge Level 2: Prominent banner
  if (nudgeLevel >= 2) {
    return (
      <div className="mb-4">
        <div className="bg-amber-100 rounded-2xl p-4 text-center">
          <p className="text-amber-700 font-medium mb-1">
            You&apos;ve been going {overMinutes} minute{overMinutes !== 1 ? "s" : ""}{" "}
            past your limit
          </p>
          <TimerDisplay elapsedSeconds={elapsedSeconds} nudgeLevel={2} />
          <button
            type="button"
            onClick={handleTakeBreak}
            className="mt-2 px-4 py-2 bg-amber-500 text-white rounded-xl text-sm
                       font-medium hover:bg-amber-600 transition-all cursor-pointer"
          >
            Take a break
          </button>
        </div>
      </div>
    );
  }

  // Nudge Level 1: Soft banner
  if (nudgeLevel >= 1) {
    return (
      <div className="mb-4">
        <div className="bg-amber-50 rounded-2xl p-4 text-center">
          <p className="text-amber-600 font-medium mb-1">
            Time&apos;s up — want to keep going?
          </p>
          <TimerDisplay elapsedSeconds={elapsedSeconds} nudgeLevel={1} />
          <button
            type="button"
            onClick={handleTakeBreak}
            className="mt-2 px-4 py-2 bg-amber-500 text-white rounded-xl text-sm
                       font-medium hover:bg-amber-600 transition-all cursor-pointer"
          >
            Take a break
          </button>
        </div>
      </div>
    );
  }

  // Nudge Level 0: Minimal display
  return (
    <div className="mb-4">
      <TimerDisplay elapsedSeconds={elapsedSeconds} nudgeLevel={0} />
    </div>
  );
}

function TimerDisplay({
  elapsedSeconds,
  nudgeLevel,
}: {
  elapsedSeconds: number;
  nudgeLevel: number;
}) {
  const style =
    nudgeLevel >= 2
      ? "text-amber-700 font-medium text-sm"
      : nudgeLevel >= 1
        ? "text-amber-600 font-medium text-sm"
        : "text-stone-400 text-sm";

  return (
    <p className={`${style} text-center`}>
      {formatTime(elapsedSeconds)} elapsed
    </p>
  );
}

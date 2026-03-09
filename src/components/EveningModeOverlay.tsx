"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface EveningModeOverlayProps {
  cutoffHour: number;
  cutoffMin: number;
  onDismiss: () => void;
}

const SNOOZE_KEY = "evening-mode-snoozed-until";
const SNOOZE_DURATION_MS = 30 * 60 * 1000; // 30 minutes
const POLL_INTERVAL_MS = 60_000;

function isSnoozed(): boolean {
  try {
    const snoozedUntil = localStorage.getItem(SNOOZE_KEY);
    return snoozedUntil !== null && Date.now() < parseInt(snoozedUntil, 10);
  } catch {
    return false;
  }
}

function isPastCutoffTime(cutoffHour: number, cutoffMin: number): boolean {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const cutoffMinutes = cutoffHour * 60 + cutoffMin;

  if (currentMinutes < cutoffMinutes) return false;
  if (isSnoozed()) return false;

  return true;
}

export default function EveningModeOverlay({
  cutoffHour,
  cutoffMin,
  onDismiss,
}: EveningModeOverlayProps): React.ReactElement | null {
  const router = useRouter();
  const [isPastCutoff, setIsPastCutoff] = useState(false);

  useEffect(() => {
    setIsPastCutoff(isPastCutoffTime(cutoffHour, cutoffMin));
  }, [cutoffHour, cutoffMin]);

  useEffect(() => {
    if (isPastCutoff) return;

    const interval = setInterval(() => {
      setIsPastCutoff(isPastCutoffTime(cutoffHour, cutoffMin));
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [cutoffHour, cutoffMin, isPastCutoff]);

  function handleSnooze(): void {
    try {
      localStorage.setItem(
        SNOOZE_KEY,
        String(Date.now() + SNOOZE_DURATION_MS),
      );
    } catch {
      // localStorage unavailable -- snooze is best-effort
    }
    setIsPastCutoff(false);
    onDismiss();
  }

  function handleWindDown(): void {
    router.push("/");
  }

  if (!isPastCutoff) return null;

  const timeStr = new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-label="Evening mode - protect your sleep"
      className="fixed inset-0 bg-indigo-950/80 z-50 flex items-center justify-center"
    >
      <div className="bg-white rounded-3xl p-8 max-w-sm shadow-2xl text-center">
        <p className="text-4xl mb-4" aria-hidden="true">
          🌙
        </p>
        <h3 className="text-xl font-semibold text-stone-800 mb-2">
          Protect your sleep
        </h3>
        <p className="text-stone-500 mb-6">
          It&apos;s {timeStr} — time to wind down
        </p>
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={handleWindDown}
            autoFocus
            className="py-3 px-6 bg-indigo-500 hover:bg-indigo-600 active:bg-indigo-700
                       text-white font-semibold rounded-2xl transition-all
                       hover:shadow-lg active:scale-[0.98] cursor-pointer"
          >
            Wind down
          </button>
          <button
            type="button"
            onClick={handleSnooze}
            className="py-2 px-6 border-2 border-stone-200 text-stone-600 font-medium
                       rounded-2xl transition-all hover:border-stone-300 cursor-pointer text-sm"
          >
            I know, keep going
          </button>
        </div>
      </div>
    </div>
  );
}

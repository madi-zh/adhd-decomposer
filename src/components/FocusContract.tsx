"use client";

import { useState } from "react";
import ErrorAlert from "@/components/ErrorAlert";

interface FocusContractProps {
  taskId: string;
  taskTitle: string;
  onSessionStart: (session: {
    id: string;
    timeLimitMin: number;
    startedAt: string;
  }) => void;
  onSkip: () => void;
}

const QUICK_PICKS = [15, 30, 45, 60, 90];

export default function FocusContract({
  taskId,
  taskTitle,
  onSessionStart,
  onSkip,
}: FocusContractProps) {
  const [selectedMin, setSelectedMin] = useState<number | null>(null);
  const [customMin, setCustomMin] = useState("");
  const [isCustom, setIsCustom] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const effectiveMin = isCustom ? parseInt(customMin, 10) : selectedMin;
  const isValid =
    effectiveMin !== null &&
    !isNaN(effectiveMin) &&
    effectiveMin >= 5 &&
    effectiveMin <= 180;

  async function handleSubmit() {
    if (!isValid || isSubmitting) return;
    setIsSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/focus-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId, timeLimitMin: effectiveMin }),
      });

      if (!res.ok) throw new Error();

      const session = await res.json();
      onSessionStart({
        id: session.id,
        timeLimitMin: session.timeLimitMin,
        startedAt: session.startedAt,
      });
    } catch {
      setError("Could not start focus session. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="pt-8 flex flex-col items-center">
      <h2 className="text-lg font-medium text-stone-600 text-center mb-2">
        {taskTitle}
      </h2>
      <p className="text-stone-500 text-center mb-6">
        How long do you want to focus?
      </p>

      <div className="flex flex-wrap justify-center gap-3 mb-4">
        {QUICK_PICKS.map((min) => (
          <button
            key={min}
            type="button"
            data-selected={!isCustom && selectedMin === min}
            onClick={() => {
              setSelectedMin(min);
              setIsCustom(false);
            }}
            className="px-4 py-2 border-2 border-stone-200 rounded-2xl hover:border-amber-400
                       data-[selected=true]:border-amber-500 data-[selected=true]:bg-amber-50
                       text-stone-700 text-sm font-medium transition-all cursor-pointer"
          >
            {min} min
          </button>
        ))}
        <button
          type="button"
          data-selected={isCustom}
          onClick={() => setIsCustom(true)}
          className="px-4 py-2 border-2 border-stone-200 rounded-2xl hover:border-amber-400
                     data-[selected=true]:border-amber-500 data-[selected=true]:bg-amber-50
                     text-stone-700 text-sm font-medium transition-all cursor-pointer"
        >
          Custom
        </button>
      </div>

      {isCustom && (
        <div className="mb-4">
          <label htmlFor="custom-minutes" className="sr-only">
            Minutes (5–180)
          </label>
          <input
            id="custom-minutes"
            type="number"
            min={5}
            max={180}
            placeholder="Minutes (5–180)"
            value={customMin}
            onChange={(e) => setCustomMin(e.target.value)}
            className="w-40 px-4 py-2 border-2 border-stone-200 rounded-2xl text-center
                       text-stone-700 focus:border-amber-400 focus:outline-none"
          />
        </div>
      )}

      {error && (
        <ErrorAlert message={error} className="text-center mb-4" />
      )}

      <button
        type="button"
        disabled={!isValid || isSubmitting}
        onClick={handleSubmit}
        className="py-3 px-8 bg-amber-500 hover:bg-amber-600 active:bg-amber-700
                   disabled:bg-amber-300 text-white font-semibold rounded-2xl
                   transition-all hover:shadow-lg active:scale-[0.98] cursor-pointer
                   disabled:cursor-not-allowed mb-3"
      >
        {isSubmitting ? "Starting..." : "Start focusing"}
      </button>

      <button
        type="button"
        onClick={onSkip}
        className="text-xs text-stone-400 hover:text-stone-500 transition-colors cursor-pointer"
      >
        Skip
      </button>
    </div>
  );
}

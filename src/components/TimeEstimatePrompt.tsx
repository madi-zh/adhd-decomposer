"use client";

import { useState } from "react";
import ErrorAlert from "@/components/ErrorAlert";
import { MIN_ESTIMATE_MINUTES, MAX_ESTIMATE_MINUTES } from "@/lib/validation";

interface TimeEstimatePromptProps {
  taskId: string;
  taskTitle: string;
  stepCount: number;
  onEstimateSet: (estimateMinutes: number, startedAt: string) => void;
  onSkip: () => void;
}

const QUICK_PICKS = [5, 10, 15, 30, 60];

export default function TimeEstimatePrompt({
  taskId,
  taskTitle,
  stepCount,
  onEstimateSet,
  onSkip,
}: TimeEstimatePromptProps) {
  const [minutes, setMinutes] = useState<number | "">("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;
    if (raw === "") {
      setMinutes("");
      return;
    }
    const num = parseInt(raw, 10);
    if (!isNaN(num) && num >= 0) {
      setMinutes(num);
    }
  }

  async function handleSubmit() {
    const value = typeof minutes === "number" ? minutes : 0;
    if (value < MIN_ESTIMATE_MINUTES || value > MAX_ESTIMATE_MINUTES) {
      setError(`Enter a time between ${MIN_ESTIMATE_MINUTES} and ${MAX_ESTIMATE_MINUTES} minutes.`);
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const res = await fetch(`/api/tasks/${taskId}/estimate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estimateMinutes: value }),
      });

      if (!res.ok) throw new Error();

      const data = await res.json();
      onEstimateSet(data.estimateMinutes, data.startedAt);
    } catch {
      setError("Could not save estimate. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col items-center pt-12 text-center">
      <h2 className="text-xl font-bold text-stone-800 mb-2">
        How long do you think this will take?
      </h2>
      <p className="text-stone-500 mb-1">{taskTitle}</p>
      <p className="text-sm text-stone-400 mb-8">
        {stepCount} step{stepCount !== 1 ? "s" : ""}
      </p>

      <div className="flex flex-wrap justify-center gap-3 mb-6">
        {QUICK_PICKS.map((value) => (
          <button
            key={value}
            type="button"
            data-selected={minutes === value}
            onClick={() => setMinutes(value)}
            className="px-4 py-2 border-2 border-stone-200 rounded-2xl text-stone-600 hover:border-amber-400 data-[selected=true]:border-amber-500 data-[selected=true]:bg-amber-50 transition-colors"
          >
            {value} min
          </button>
        ))}
      </div>

      <div className="mb-6">
        <input
          type="number"
          min={MIN_ESTIMATE_MINUTES}
          max={MAX_ESTIMATE_MINUTES}
          value={minutes}
          onChange={handleInputChange}
          placeholder="min"
          className="w-24 text-center text-2xl font-bold border-2 border-stone-200 rounded-2xl p-3 focus:border-amber-400 focus:ring-4 focus:ring-amber-100 outline-none"
        />
      </div>

      {error ? (
        <ErrorAlert message={error} className="mb-4" />
      ) : null}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={isSubmitting || minutes === "" || minutes < 1}
        className="py-4 px-8 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-lg rounded-2xl transition-all hover:shadow-lg active:scale-[0.98]"
      >
        {isSubmitting ? "Starting..." : "Start timer"}
      </button>

      <button
        type="button"
        onClick={onSkip}
        className="mt-4 text-xs text-stone-400 hover:text-stone-500 transition-colors"
      >
        Skip
      </button>
    </div>
  );
}

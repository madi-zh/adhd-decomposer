"use client";

import { useState } from "react";
import { MOODS } from "@/lib/moods";

interface MoodCheckInProps {
  taskId: string;
  timing: "before" | "after";
  onComplete: (mood: string) => void;
  onSkip: () => void;
}

export default function MoodCheckIn({
  taskId,
  timing,
  onComplete,
  onSkip,
}: MoodCheckInProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [saveError, setSaveError] = useState(false);

  async function handleSelect(mood: string) {
    if (submitted) return;
    setSubmitted(true);
    setSelected(mood);
    setSaveError(false);

    try {
      const res = await fetch("/api/mood", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId, mood, timing }),
      });
      if (!res.ok) throw new Error();
      onComplete(mood);
    } catch {
      setSaveError(true);
      setSubmitted(false);
      setSelected(null);
    }
  }

  return (
    <div className="flex flex-col items-center justify-center pt-12">
      <h2 className="text-xl font-medium text-stone-700 mb-8">
        {timing === "before"
          ? "How are you feeling right now?"
          : "How do you feel after finishing?"}
      </h2>

      {saveError && (
        <p role="alert" className="text-red-500 text-sm text-center mb-4">
          Could not save. Please try again.
        </p>
      )}

      <div role="group" aria-label="Mood selection" className="flex gap-3 flex-wrap justify-center">
        {MOODS.map((mood) => (
          <button
            key={mood.key}
            disabled={submitted}
            aria-pressed={selected === mood.key}
            data-selected={selected === mood.key || undefined}
            onClick={() => handleSelect(mood.key)}
            className="flex flex-col items-center gap-1 p-4 rounded-2xl border-2 border-stone-200
                       hover:border-amber-400 transition-all w-20
                       focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2
                       disabled:opacity-50 disabled:cursor-not-allowed
                       data-[selected]:border-amber-500 data-[selected]:bg-amber-50 data-[selected]:scale-105"
          >
            <mood.icon className={mood.color} size={32} aria-hidden="true" />
            <span className="text-xs text-stone-600">{mood.label}</span>
          </button>
        ))}
      </div>

      <button
        onClick={onSkip}
        disabled={submitted}
        className="text-xs text-stone-400 hover:text-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 rounded mt-6 disabled:opacity-50"
      >
        Skip
      </button>
    </div>
  );
}

"use client";

import { useState } from "react";

const MOODS = [
  { key: "calm", emoji: "\u{1F60C}", label: "Calm" },
  { key: "excited", emoji: "\u2728", label: "Excited" },
  { key: "anxious", emoji: "\u{1F630}", label: "Anxious" },
  { key: "frustrated", emoji: "\u{1F624}", label: "Frustrated" },
  { key: "tired", emoji: "\u{1F971}", label: "Tired" },
] as const;

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

  function handleSelect(mood: string) {
    setSelected(mood);
    onComplete(mood);

    // Fire-and-forget save
    fetch("/api/mood", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskId, mood, timing }),
    }).catch(() => {});
  }

  return (
    <div className="flex flex-col items-center justify-center pt-12">
      <h2 className="text-xl font-medium text-stone-700 mb-8">
        {timing === "before"
          ? "How are you feeling right now?"
          : "How do you feel after finishing?"}
      </h2>

      <div role="radiogroup" aria-label="Mood selection" className="flex gap-3 flex-wrap justify-center">
        {MOODS.map((mood) => (
          <button
            key={mood.key}
            role="radio"
            aria-checked={selected === mood.key}
            data-selected={selected === mood.key || undefined}
            onClick={() => handleSelect(mood.key)}
            className="flex flex-col items-center gap-1 p-4 rounded-2xl border-2 border-stone-200
                       hover:border-amber-400 transition-all w-20
                       data-[selected]:border-amber-500 data-[selected]:bg-amber-50 data-[selected]:scale-105"
          >
            <span className="text-3xl" aria-hidden="true">
              {mood.emoji}
            </span>
            <span className="text-xs text-stone-500">{mood.label}</span>
          </button>
        ))}
      </div>

      <button
        onClick={onSkip}
        className="text-xs text-stone-400 hover:text-stone-500 mt-6"
      >
        Skip
      </button>
    </div>
  );
}

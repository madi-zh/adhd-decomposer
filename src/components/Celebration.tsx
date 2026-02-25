"use client";

import { useEffect } from "react";
import Link from "next/link";

const MOOD_EMOJIS: Record<string, string> = {
  calm: "\u{1F60C}",
  excited: "\u2728",
  anxious: "\u{1F630}",
  frustrated: "\u{1F624}",
  tired: "\u{1F971}",
};

interface CelebrationProps {
  taskTitle: string;
  moodBefore?: string | null;
  moodAfter?: string | null;
}

export default function Celebration({ taskTitle, moodBefore, moodAfter }: CelebrationProps) {
  useEffect(() => {
    import("canvas-confetti").then((mod) => {
      const confetti = mod.default;
      const duration = 3000;
      const end = Date.now() + duration;

      const frame = () => {
        confetti({
          particleCount: 3,
          angle: 60,
          spread: 55,
          origin: { x: 0, y: 0.7 },
          colors: ["#f59e0b", "#10b981", "#6366f1"],
        });
        confetti({
          particleCount: 3,
          angle: 120,
          spread: 55,
          origin: { x: 1, y: 0.7 },
          colors: ["#f59e0b", "#10b981", "#6366f1"],
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };

      frame();
    });
  }, []);

  return (
    <div className="flex flex-col items-center justify-center pt-16 text-center">
      <div className="text-6xl mb-6" role="img" aria-label="Party popper">&#127881;</div>
      <h1 className="text-3xl font-bold text-stone-800 mb-2">You did it!</h1>
      <p className="text-lg text-stone-500 mb-2">
        You finished every single step.
      </p>
      <p className="text-stone-400 mb-10">&ldquo;{taskTitle}&rdquo;</p>

      {moodBefore && moodAfter && (
        <div className="flex items-center gap-2 bg-stone-50 rounded-full px-4 py-2 mb-6">
          <span>{MOOD_EMOJIS[moodBefore] ?? moodBefore}</span>
          <span className="text-stone-300">&rarr;</span>
          <span>{MOOD_EMOJIS[moodAfter] ?? moodAfter}</span>
        </div>
      )}

      <Link
        href="/"
        className="py-4 px-8 bg-amber-500 hover:bg-amber-600 text-white font-semibold text-lg
                   rounded-2xl transition-all hover:shadow-lg active:scale-[0.98] inline-block"
      >
        Do another task
      </Link>

      <Link
        href="/history"
        className="mt-4 text-sm text-stone-400 hover:text-stone-600 transition-colors"
      >
        View completed tasks
      </Link>
    </div>
  );
}

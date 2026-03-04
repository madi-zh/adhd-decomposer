"use client";

import { useEffect } from "react";
import Link from "next/link";
import { MOOD_MAP } from "@/lib/moods";
import { PartyPopper, ArrowRight } from "lucide-react";

interface CelebrationProps {
  taskTitle: string;
  moodBefore?: string | null;
  moodAfter?: string | null;
}

export default function Celebration({ taskTitle, moodBefore, moodAfter }: CelebrationProps) {
  useEffect(() => {
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

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

  const BeforeIcon = moodBefore ? MOOD_MAP[moodBefore]?.icon : null;
  const AfterIcon = moodAfter ? MOOD_MAP[moodAfter]?.icon : null;

  return (
    <div className="flex flex-col items-center justify-center pt-16 text-center">
      <div className="mb-6" role="img" aria-label="Party popper"><PartyPopper size={64} className="text-amber-500" /></div>
      <h1 className="text-3xl font-bold text-stone-800 mb-2">You did it!</h1>
      <p className="text-lg text-stone-500 mb-2">
        You finished every single step.
      </p>
      <p className="text-stone-400 mb-10">&ldquo;{taskTitle}&rdquo;</p>

      {moodBefore && moodAfter && (
        <div
          className="flex items-center gap-2 bg-stone-50 rounded-full px-4 py-2 mb-6"
          aria-label={`Mood before: ${moodBefore}. Mood after: ${moodAfter}.`}
        >
          {BeforeIcon ? (
            <BeforeIcon className={MOOD_MAP[moodBefore!].color} size={20} aria-hidden="true" />
          ) : (
            <span aria-hidden="true">{moodBefore}</span>
          )}
          <ArrowRight size={16} className="text-stone-300" aria-hidden="true" />
          {AfterIcon ? (
            <AfterIcon className={MOOD_MAP[moodAfter!].color} size={20} aria-hidden="true" />
          ) : (
            <span aria-hidden="true">{moodAfter}</span>
          )}
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

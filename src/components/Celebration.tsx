"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import TimeComparison from "@/components/TimeComparison";
import { MOOD_MAP } from "@/lib/moods";
import { PartyPopper, ArrowRight } from "lucide-react";

interface CelebrationProps {
  taskTitle: string;
  confettiColors?: string[];
  xpAwarded?: number;
  timeEstimate?: {
    estimateMinutes: number;
    actualMinutes: number;
  } | null;
  moodBefore?: string | null;
  moodAfter?: string | null;
}

export default function Celebration({
  taskTitle,
  confettiColors,
  xpAwarded,
  timeEstimate,
  moodBefore,
  moodAfter,
}: CelebrationProps) {
  const colorsRef = useRef(confettiColors);
  colorsRef.current = confettiColors;

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let cancelled = false;

    const colors = colorsRef.current ?? ["#f59e0b", "#10b981", "#6366f1"];

    import("canvas-confetti").then((mod) => {
      if (cancelled) return;

      const confetti = mod.default;
      const end = Date.now() + 3000;

      function frame(): void {
        if (cancelled || Date.now() >= end) return;

        confetti({
          particleCount: 3,
          angle: 60,
          spread: 55,
          origin: { x: 0, y: 0.7 },
          colors,
        });
        confetti({
          particleCount: 3,
          angle: 120,
          spread: 55,
          origin: { x: 1, y: 0.7 },
          colors,
        });

        requestAnimationFrame(frame);
      }

      frame();
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const BeforeIcon = moodBefore ? MOOD_MAP[moodBefore]?.icon : null;
  const AfterIcon = moodAfter ? MOOD_MAP[moodAfter]?.icon : null;

  return (
    <div className="flex flex-col items-center justify-center pt-16 text-center">
      <div className="mb-6" role="img" aria-label="Party popper">
        <PartyPopper size={64} className="text-amber-500" />
      </div>
      <h1 className="text-3xl font-bold text-stone-800 mb-2">You did it!</h1>
      <p className="text-lg text-stone-500 mb-2">
        You finished every single step.
      </p>
      <p className="text-stone-400 mb-4">&ldquo;{taskTitle}&rdquo;</p>

      {xpAwarded !== undefined && xpAwarded > 0 ? (
        <p className="text-amber-600 font-bold text-lg bg-amber-50 rounded-full px-4 py-1 mb-6">
          +{xpAwarded} XP
        </p>
      ) : null}

      {timeEstimate ? (
        <TimeComparison
          estimateMinutes={timeEstimate.estimateMinutes}
          actualMinutes={timeEstimate.actualMinutes}
        />
      ) : null}

      {moodBefore && moodAfter ? (
        <div
          className="flex items-center gap-2 bg-stone-50 rounded-full px-4 py-2 mb-6"
          aria-label={`Mood before: ${moodBefore}. Mood after: ${moodAfter}.`}
        >
          {BeforeIcon ? (
            <BeforeIcon className={MOOD_MAP[moodBefore!]?.color ?? ""} size={20} aria-hidden="true" />
          ) : (
            <span aria-hidden="true">{moodBefore}</span>
          )}
          <ArrowRight size={16} className="text-stone-300" aria-hidden="true" />
          {AfterIcon ? (
            <AfterIcon className={MOOD_MAP[moodAfter!]?.color ?? ""} size={20} aria-hidden="true" />
          ) : (
            <span aria-hidden="true">{moodAfter}</span>
          )}
        </div>
      ) : null}

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

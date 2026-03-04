"use client";

import { useState, useEffect, useRef } from "react";

import { type DistressedMood } from "@/lib/moods";

interface MicroRegulationProps {
  mood: DistressedMood;
  onComplete: () => void;
  onSkip: () => void;
}

// --- Box Breathing (anxious) ---

const BREATHING_PHASES = ["Breathe in...", "Hold...", "Breathe out...", "Hold..."] as const;

function BoxBreathing({ onComplete }: { onComplete: () => void }) {
  const [phaseIndex, setPhaseIndex] = useState(0);
  const completed = useRef(false);

  useEffect(() => {
    const phaseInterval = setInterval(() => {
      setPhaseIndex((prev) => (prev + 1) % BREATHING_PHASES.length);
    }, 4000);

    const timeout = setTimeout(() => {
      if (!completed.current) {
        completed.current = true;
        onComplete();
      }
    }, 30000);

    return () => {
      clearInterval(phaseInterval);
      clearTimeout(timeout);
    };
  }, [onComplete]);

  const isExpanded = phaseIndex === 0 || phaseIndex === 1;
  const prefersReducedMotion = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  return (
    <>
      <div
        className={`w-32 h-32 rounded-full border-4 border-amber-400 ${
          prefersReducedMotion
            ? (isExpanded ? "bg-amber-100" : "bg-white")
            : `transition-all duration-[4000ms] ${isExpanded ? "scale-125 bg-amber-100" : "scale-100 bg-white"}`
        }`}
      />
      <p aria-live="polite" className="text-lg text-stone-600 mt-8">
        {BREATHING_PHASES[phaseIndex]}
      </p>
    </>
  );
}

// --- CBT Reframe (frustrated) ---

const REFRAME_CARDS = [
  "What\u2019s the smallest thing I can do right now?",
  "I don\u2019t have to finish \u2014 I have to start.",
  "This feeling will pass.",
];

function CbtReframe({ onComplete }: { onComplete: () => void }) {
  const [cardIndex, setCardIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  const innerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (cardIndex >= REFRAME_CARDS.length - 1) {
      const timer = setTimeout(onComplete, 8000);
      return () => clearTimeout(timer);
    }

    const timer = setTimeout(() => {
      setVisible(false);
      innerTimer.current = setTimeout(() => {
        setCardIndex((prev) => prev + 1);
        setVisible(true);
      }, 500);
    }, 8000);
    return () => {
      clearTimeout(timer);
      if (innerTimer.current) clearTimeout(innerTimer.current);
    };
  }, [cardIndex, onComplete]);

  return (
    <div
      aria-live="polite"
      className={`bg-amber-50 rounded-2xl p-6 text-center text-lg text-stone-700 max-w-sm transition-opacity duration-500 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
    >
      {REFRAME_CARDS[cardIndex]}
    </div>
  );
}

// --- 5-4-3-2-1 Grounding (tired) ---

const GROUNDING_PROMPTS = [
  "Name 5 things you can see",
  "Name 4 things you can touch",
  "Name 3 things you can hear",
  "Name 2 things you can smell",
  "Name 1 thing you can taste",
];

function Grounding({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (step >= GROUNDING_PROMPTS.length - 1) {
      const timer = setTimeout(onComplete, 6000);
      return () => clearTimeout(timer);
    }

    const timer = setTimeout(() => {
      setStep((prev) => prev + 1);
    }, 6000);
    return () => clearTimeout(timer);
  }, [step, onComplete]);

  return (
    <p aria-live="polite" className="text-xl font-medium text-stone-700">
      {GROUNDING_PROMPTS[step]}
    </p>
  );
}

// --- Main Component ---

export default function MicroRegulation({
  mood,
  onComplete,
  onSkip,
}: MicroRegulationProps) {
  return (
    <div className="flex flex-col items-center justify-center pt-12">
      {mood === "anxious" && <BoxBreathing onComplete={onComplete} />}
      {mood === "frustrated" && <CbtReframe onComplete={onComplete} />}
      {mood === "tired" && <Grounding onComplete={onComplete} />}

      <button
        onClick={onSkip}
        className="text-sm text-stone-400 hover:text-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 rounded mt-8"
      >
        I&apos;m ready to start
      </button>
    </div>
  );
}

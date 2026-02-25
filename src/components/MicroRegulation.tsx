"use client";

import { useState, useEffect, useCallback } from "react";

interface MicroRegulationProps {
  mood: "anxious" | "frustrated" | "tired";
  onComplete: () => void;
  onSkip: () => void;
}

// --- Box Breathing (anxious) ---

function BoxBreathing({ onComplete }: { onComplete: () => void }) {
  const phases = ["Breathe in...", "Hold...", "Breathe out...", "Hold..."] as const;
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setPhaseIndex((prev) => (prev + 1) % phases.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [phases.length]);

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (elapsed >= 30) {
      onComplete();
    }
  }, [elapsed, onComplete]);

  const isExpanded = phaseIndex === 0 || phaseIndex === 1;

  return (
    <>
      <div
        className={`w-32 h-32 rounded-full border-4 border-amber-400 transition-all duration-[4000ms] ${
          isExpanded ? "scale-125 bg-amber-100" : "scale-100 bg-white"
        }`}
      />
      <p aria-live="polite" className="text-lg text-stone-600 mt-8">
        {phases[phaseIndex]}
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

  useEffect(() => {
    if (cardIndex >= REFRAME_CARDS.length - 1) {
      const timer = setTimeout(onComplete, 8000);
      return () => clearTimeout(timer);
    }

    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(() => {
        setCardIndex((prev) => prev + 1);
        setVisible(true);
      }, 500);
    }, 8000);
    return () => clearTimeout(timer);
  }, [cardIndex, onComplete]);

  return (
    <div
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
    <p className="text-xl font-medium text-stone-700">
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
  const handleComplete = useCallback(() => {
    onComplete();
  }, [onComplete]);

  return (
    <div className="flex flex-col items-center justify-center pt-12">
      {mood === "anxious" && <BoxBreathing onComplete={handleComplete} />}
      {mood === "frustrated" && <CbtReframe onComplete={handleComplete} />}
      {mood === "tired" && <Grounding onComplete={handleComplete} />}

      <button
        onClick={onSkip}
        className="text-sm text-stone-400 hover:text-stone-500 mt-8"
      >
        I&apos;m ready to start
      </button>
    </div>
  );
}

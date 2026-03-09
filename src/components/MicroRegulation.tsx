"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

import { type DistressedMood } from "@/lib/moods";

interface MicroRegulationProps {
  mood: DistressedMood;
  onComplete: () => void;
  onSkip: () => void;
}

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeToReducedMotion(callback: () => void): () => void {
  const mq = window.matchMedia(REDUCED_MOTION_QUERY);
  mq.addEventListener("change", callback);
  return () => mq.removeEventListener("change", callback);
}

function getReducedMotionSnapshot(): boolean {
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

function getReducedMotionServerSnapshot(): boolean {
  return false;
}

// --- Box Breathing (anxious) ---

const BREATHING_PHASES = [
  "Breathe in...",
  "Hold...",
  "Breathe out...",
  "Hold...",
] as const;

function BoxBreathing({
  onComplete,
}: {
  onComplete: () => void;
}): React.ReactElement {
  const [phaseIndex, setPhaseIndex] = useState(0);
  const onCompleteRef = useRef(onComplete);
  const completed = useRef(false);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const prefersReducedMotion = useSyncExternalStore(
    subscribeToReducedMotion,
    getReducedMotionSnapshot,
    getReducedMotionServerSnapshot,
  );

  useEffect(() => {
    const phaseInterval = setInterval(() => {
      setPhaseIndex((prev) => (prev + 1) % BREATHING_PHASES.length);
    }, 4000);

    const timeout = setTimeout(() => {
      if (!completed.current) {
        completed.current = true;
        onCompleteRef.current();
      }
    }, 30000);

    return () => {
      clearInterval(phaseInterval);
      clearTimeout(timeout);
    };
  }, []);

  const isExpanded = phaseIndex === 0 || phaseIndex === 1;

  const circleClass = prefersReducedMotion
    ? `w-32 h-32 rounded-full border-4 border-amber-400 ${isExpanded ? "bg-amber-100" : "bg-white"}`
    : `w-32 h-32 rounded-full border-4 border-amber-400 transition-all duration-[4000ms] ${isExpanded ? "scale-125 bg-amber-100" : "scale-100 bg-white"}`;

  return (
    <>
      <div className={circleClass} />
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

function CbtReframe({
  onComplete,
}: {
  onComplete: () => void;
}): React.ReactElement {
  const [cardIndex, setCardIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  const onCompleteRef = useRef(onComplete);
  const innerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    const isLastCard = cardIndex >= REFRAME_CARDS.length - 1;

    if (isLastCard) {
      const timer = setTimeout(() => onCompleteRef.current(), 8000);
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
  }, [cardIndex]);

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

function Grounding({
  onComplete,
}: {
  onComplete: () => void;
}): React.ReactElement {
  const [step, setStep] = useState(0);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    const isLastStep = step >= GROUNDING_PROMPTS.length - 1;

    if (isLastStep) {
      const timer = setTimeout(() => onCompleteRef.current(), 6000);
      return () => clearTimeout(timer);
    }

    const timer = setTimeout(() => {
      setStep((prev) => prev + 1);
    }, 6000);
    return () => clearTimeout(timer);
  }, [step]);

  return (
    <p aria-live="polite" className="text-xl font-medium text-stone-700">
      {GROUNDING_PROMPTS[step]}
    </p>
  );
}

// --- Main Component ---

function renderExercise(
  mood: DistressedMood,
  onComplete: () => void,
): React.ReactElement {
  switch (mood) {
    case "anxious":
      return <BoxBreathing onComplete={onComplete} />;
    case "frustrated":
      return <CbtReframe onComplete={onComplete} />;
    case "tired":
      return <Grounding onComplete={onComplete} />;
  }
}

export default function MicroRegulation({
  mood,
  onComplete,
  onSkip,
}: MicroRegulationProps): React.ReactElement {
  return (
    <div className="flex flex-col items-center justify-center pt-12">
      {renderExercise(mood, onComplete)}

      <button
        onClick={onSkip}
        className="text-sm text-stone-400 hover:text-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 rounded mt-8"
      >
        I&apos;m ready to start
      </button>
    </div>
  );
}

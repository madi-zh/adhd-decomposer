"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface AmbientTimerProps {
  startedAt: string;
  estimateMinutes: number;
}

function formatElapsed(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function getTimerColor(ratio: number): string {
  if (ratio > 1) return "text-amber-600";
  if (ratio > 0.8) return "text-amber-500";
  return "text-stone-400";
}

export default function AmbientTimer({
  startedAt,
  estimateMinutes,
}: AmbientTimerProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState(() =>
    Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000)
  );

  const lastAnnouncedRef = useRef(0);
  const announcementRef = useRef<HTMLSpanElement>(null);

  const announce = useCallback((text: string) => {
    if (announcementRef.current) {
      announcementRef.current.textContent = text;
    }
  }, []);

  useEffect(() => {
    const start = new Date(startedAt).getTime();
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - start) / 1000);
      setElapsedSeconds(elapsed);

      const elapsedMinutes = Math.floor(elapsed / 60);
      const fiveMinBlock = Math.floor(elapsedMinutes / 5);
      if (fiveMinBlock > lastAnnouncedRef.current && fiveMinBlock > 0) {
        lastAnnouncedRef.current = fiveMinBlock;
        announce(`${elapsedMinutes} minutes elapsed`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [startedAt, announce]);

  const colorClass = getTimerColor(elapsedSeconds / (estimateMinutes * 60));

  return (
    <div role="timer" className={`text-center text-sm mb-2 ${colorClass}`}>
      <span>
        {formatElapsed(elapsedSeconds)} elapsed / ~{estimateMinutes} min
        estimated
      </span>
      <span className="sr-only" aria-live="polite" ref={announcementRef} />
    </div>
  );
}

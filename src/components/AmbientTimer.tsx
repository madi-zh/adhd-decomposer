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

export default function AmbientTimer({
  startedAt,
  estimateMinutes,
}: AmbientTimerProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState(() => {
    return Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000);
  });

  const lastAnnouncedRef = useRef(0);
  const announcementRef = useRef<HTMLSpanElement>(null);

  const announce = useCallback((text: string) => {
    if (announcementRef.current) {
      announcementRef.current.textContent = text;
    }
  }, []);

  useEffect(() => {
    const startTime = new Date(startedAt).getTime();
    const interval = setInterval(() => {
      const now = Date.now();
      const elapsed = Math.floor((now - startTime) / 1000);
      setElapsedSeconds(elapsed);

      // Announce every 5 minutes for screen readers
      const elapsedMinutes = Math.floor(elapsed / 60);
      const fiveMinBlock = Math.floor(elapsedMinutes / 5);
      if (fiveMinBlock > lastAnnouncedRef.current && fiveMinBlock > 0) {
        lastAnnouncedRef.current = fiveMinBlock;
        announce(`${elapsedMinutes} minutes elapsed`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [startedAt, announce]);

  const ratio = elapsedSeconds / (estimateMinutes * 60);

  let colorClass = "text-stone-400";
  if (ratio > 1) {
    colorClass = "text-amber-600";
  } else if (ratio > 0.8) {
    colorClass = "text-amber-500";
  }

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

"use client";

import { useMemo } from "react";

interface UrgencyGradientProps {
  deadline: string;
  createdAt: string;
  children: React.ReactNode;
}

function computeUrgency(deadline: string, createdAt: string) {
  const now = Date.now();
  const start = new Date(createdAt).getTime();
  const end = new Date(deadline).getTime();
  const totalDuration = end - start;
  const remaining = end - now;

  let borderClass: string;
  let urgencyText: string;
  let bgClass = "";

  if (remaining <= 0) {
    borderClass = "border-red-500";
    bgClass = "bg-red-50";
    urgencyText = "Overdue";
  } else {
    const pctRemaining = remaining / totalDuration;
    if (pctRemaining > 0.5) {
      borderClass = "border-blue-300";
      urgencyText = "Plenty of time remaining";
    } else if (pctRemaining > 0.25) {
      borderClass = "border-amber-400";
      urgencyText = "Time is running low";
    } else {
      borderClass = "border-red-400";
      urgencyText = "Urgent — deadline approaching";
    }
  }

  return { borderClass, bgClass, urgencyText, isOverdue: remaining <= 0 };
}

export default function UrgencyGradient({
  deadline,
  createdAt,
  children,
}: UrgencyGradientProps) {
  const { borderClass, bgClass, urgencyText, isOverdue } = useMemo(
    () => computeUrgency(deadline, createdAt),
    [deadline, createdAt]
  );

  return (
    <div
      className={`rounded-3xl p-0.5 border-2 transition-colors duration-1000 ${borderClass} ${bgClass}`}
    >
      <span className="sr-only">{urgencyText}</span>
      {isOverdue && (
        <p className="text-red-600 text-xs font-medium text-center pt-2">
          Overdue
        </p>
      )}
      {children}
    </div>
  );
}

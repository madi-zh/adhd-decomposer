"use client";

import { useState, useEffect } from "react";

interface UrgencyGradientProps {
  deadline: string;
  createdAt: string;
  children: React.ReactNode;
}

function computeUrgency(deadline: string, createdAt: string) {
  const now = Date.now();
  const start = new Date(createdAt).getTime();
  const end = new Date(deadline).getTime();
  const remaining = end - now;

  if (remaining <= 0) {
    return { borderClass: "border-red-500", bgClass: "bg-red-50", urgencyText: "Overdue", isOverdue: true };
  }

  const pctRemaining = remaining / (end - start);
  if (pctRemaining > 0.5) {
    return { borderClass: "border-blue-300", bgClass: "", urgencyText: "Plenty of time remaining", isOverdue: false };
  }
  if (pctRemaining > 0.25) {
    return { borderClass: "border-amber-400", bgClass: "", urgencyText: "Time is running low", isOverdue: false };
  }
  return { borderClass: "border-red-400", bgClass: "", urgencyText: "Urgent — deadline approaching", isOverdue: false };
}

export default function UrgencyGradient({
  deadline,
  createdAt,
  children,
}: UrgencyGradientProps) {
  const [urgency, setUrgency] = useState(() => computeUrgency(deadline, createdAt));

  useEffect(() => {
    const interval = setInterval(() => {
      setUrgency(computeUrgency(deadline, createdAt));
    }, 60_000);
    return () => clearInterval(interval);
  }, [deadline, createdAt]);

  return (
    <div
      className={`rounded-3xl p-0.5 border-2 transition-colors duration-1000 ${urgency.borderClass} ${urgency.bgClass}`}
    >
      <span className="sr-only">{urgency.urgencyText}</span>
      {urgency.isOverdue ? (
        <p className="text-red-600 text-xs font-medium text-center pt-2">
          Overdue
        </p>
      ) : null}
      {children}
    </div>
  );
}

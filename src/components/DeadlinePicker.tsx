"use client";

import { useState } from "react";

interface DeadlinePickerProps {
  taskId: string;
  onDeadlineSet: (deadline: string) => void;
}

function getQuickPickDate(option: "today" | "tomorrow" | "week"): string {
  const d = new Date();
  if (option === "today") {
    d.setHours(23, 59, 0, 0);
  } else if (option === "tomorrow") {
    d.setDate(d.getDate() + 1);
    d.setHours(23, 59, 0, 0);
  } else {
    d.setDate(d.getDate() + (7 - d.getDay()));
    d.setHours(23, 59, 0, 0);
  }
  return d.toISOString();
}

export default function DeadlinePicker({
  taskId,
  onDeadlineSet,
}: DeadlinePickerProps) {
  const [expanded, setExpanded] = useState(false);
  const [customDate, setCustomDate] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function saveDeadline(deadline: string) {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/tasks/${taskId}/deadline`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deadline }),
      });
      if (!res.ok) throw new Error();
      onDeadlineSet(deadline);
      setExpanded(false);
    } catch {
      // Silently fail — user can retry
    } finally {
      setIsSaving(false);
    }
  }

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="text-sm text-stone-400 hover:text-stone-600 transition-colors"
      >
        Set a deadline (optional)
      </button>
    );
  }

  const quickPickClass =
    "px-3 py-1.5 border border-stone-200 rounded-xl text-sm hover:border-amber-400 transition-colors disabled:opacity-50";

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex gap-2">
        <button
          className={quickPickClass}
          disabled={isSaving}
          onClick={() => saveDeadline(getQuickPickDate("today"))}
        >
          Today
        </button>
        <button
          className={quickPickClass}
          disabled={isSaving}
          onClick={() => saveDeadline(getQuickPickDate("tomorrow"))}
        >
          Tomorrow
        </button>
        <button
          className={quickPickClass}
          disabled={isSaving}
          onClick={() => saveDeadline(getQuickPickDate("week"))}
        >
          This week
        </button>
      </div>
      <div className="flex gap-2 items-center">
        <input
          type="datetime-local"
          value={customDate}
          onChange={(e) => setCustomDate(e.target.value)}
          className="border border-stone-200 rounded-xl px-3 py-1.5 text-sm"
        />
        <button
          className={quickPickClass}
          disabled={isSaving || !customDate}
          onClick={() => saveDeadline(new Date(customDate).toISOString())}
        >
          Set
        </button>
      </div>
    </div>
  );
}

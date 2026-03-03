"use client";

import { useState, useEffect } from "react";

export default function FocusRoomBadge() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    async function fetchCount() {
      try {
        const res = await fetch("/api/focus-room/count");
        if (res.ok) {
          const data = await res.json();
          setCount(data.activeCount);
        }
      } catch {
        // Silently fail — badge is non-critical
      }
    }

    fetchCount();
    const interval = setInterval(fetchCount, 60000);
    return () => clearInterval(interval);
  }, []);

  if (count === 0) return null;

  return (
    <div className="text-sm text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full inline-flex items-center gap-1.5">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
      </span>
      {count} {count === 1 ? "person" : "people"} focusing now
    </div>
  );
}

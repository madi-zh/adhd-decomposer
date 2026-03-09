"use client";

import { useState, useEffect, useRef } from "react";
import { seedToColor } from "@/lib/focus-room";

interface ActiveUser {
  avatarSeed: string;
  stepContent: string | null;
  minutesFocusing: number;
}

interface FocusRoomPresenceBarProps {
  presenceId: string;
  currentStepContent: string | null;
}

export default function FocusRoomPresenceBar({
  presenceId,
  currentStepContent,
}: FocusRoomPresenceBarProps) {
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);
  const [totalActive, setTotalActive] = useState(1);
  const stepContentRef = useRef(currentStepContent);

  useEffect(() => {
    stepContentRef.current = currentStepContent;
  }, [currentStepContent]);

  useEffect(() => {
    let active = true;

    async function doPing() {
      try {
        const res = await fetch("/api/focus-room/ping", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            presenceId,
            stepContent: stepContentRef.current,
          }),
        });
        if (res.ok && active) {
          const data = await res.json();
          setActiveUsers(data.activeUsers);
          setTotalActive(data.totalActive);
        }
      } catch {
        // Silently fail — presence is eventually-consistent
      }
    }

    doPing();
    const interval = setInterval(doPing, 30000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [presenceId]);

  // Leave on unmount / tab close
  useEffect(() => {
    function leave() {
      const body = JSON.stringify({ presenceId });
      if (navigator.sendBeacon) {
        navigator.sendBeacon(
          "/api/focus-room/leave",
          new Blob([body], { type: "application/json" })
        );
      } else {
        fetch("/api/focus-room/leave", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body,
          keepalive: true,
        });
      }
    }

    window.addEventListener("beforeunload", leave);
    return () => {
      window.removeEventListener("beforeunload", leave);
      leave();
    };
  }, [presenceId]);

  const visibleUsers = activeUsers.slice(0, 8);
  const hiddenCount = activeUsers.length - visibleUsers.length;

  return (
    <div className="bg-emerald-50 rounded-2xl px-4 py-2.5 mb-4 flex items-center gap-3">
      <span className="relative flex h-2 w-2 shrink-0">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
      </span>

      {visibleUsers.length > 0 ? (
        <div className="flex -space-x-2">
          {visibleUsers.map((user) => (
            <div
              key={user.avatarSeed}
              className="w-6 h-6 rounded-full border-2 border-white relative group"
              style={{ backgroundColor: seedToColor(user.avatarSeed) }}
            >
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-stone-800 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                Focusing for {user.minutesFocusing} min
              </div>
            </div>
          ))}
          {hiddenCount > 0 ? (
            <div className="w-6 h-6 rounded-full border-2 border-white bg-emerald-200 flex items-center justify-center text-[10px] text-emerald-700 font-medium">
              +{hiddenCount}
            </div>
          ) : null}
        </div>
      ) : null}

      <span className="text-sm text-emerald-700 font-medium">
        {totalActive} {totalActive === 1 ? "person" : "people"} focusing
      </span>
    </div>
  );
}

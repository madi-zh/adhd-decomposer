"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { Settings } from "lucide-react";

export default function NavBar() {
  const { data: session } = useSession();
  const [streak, setStreak] = useState<number>(0);

  const userId = session?.user?.email ?? null;

  useEffect(() => {
    if (!userId) return;

    fetch("/api/user/streak")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.currentStreak) setStreak(data.currentStreak);
      })
      .catch(() => {});
  }, [userId]);

  function handleSignOut(): void {
    signOut({ callbackUrl: "/login" });
  }

  return (
    <nav
      aria-label="Main navigation"
      className="border-b border-stone-200 bg-white/80 backdrop-blur-sm sticky top-0 z-50"
    >
      <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="text-lg font-semibold text-stone-800">
          tiny steps
        </Link>
        {session?.user ? (
          <div className="flex items-center gap-4">
            <Link
              href="/history"
              className="text-sm text-stone-500 hover:text-stone-700 transition-colors"
            >
              History
            </Link>
            {streak >= 1 ? (
              <span
                className="text-sm text-amber-600 font-medium"
                aria-label={`${streak} day streak`}
              >
                🔥 {streak}
              </span>
            ) : null}
            <Link
              href="/settings"
              className="text-stone-400 hover:text-stone-600 transition-colors"
              aria-label="Settings"
            >
              <Settings size={18} />
            </Link>
            <span className="text-sm text-stone-400">
              {session.user.name || session.user.email}
            </span>
            <button
              onClick={handleSignOut}
              className="text-sm text-stone-500 hover:text-stone-700 transition-colors"
            >
              Sign out
            </button>
          </div>
        ) : null}
      </div>
    </nav>
  );
}

"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { useEffect, useState } from "react";

export default function NavBar() {
  const { data: session } = useSession();
  const [streak, setStreak] = useState<number>(0);

  useEffect(() => {
    if (!session?.user) return;
    fetch("/api/user/streak")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.currentStreak) setStreak(data.currentStreak);
      })
      .catch(() => {});
  }, [session?.user]);

  return (
    <nav
      aria-label="Main navigation"
      className="border-b border-stone-200 bg-white/80 backdrop-blur-sm sticky top-0 z-50"
    >
      <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="text-lg font-semibold text-stone-800">
          tiny steps
        </Link>
        {session?.user && (
          <div className="flex items-center gap-4">
            <Link
              href="/history"
              className="text-sm text-stone-500 hover:text-stone-700 transition-colors"
            >
              History
            </Link>
            {streak >= 1 && (
              <span
                className="text-sm text-amber-600 font-medium"
                aria-label={`${streak} day streak`}
              >
                🔥 {streak}
              </span>
            )}
            <span className="text-sm text-stone-400">
              {session.user.name || session.user.email}
            </span>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="text-sm text-stone-500 hover:text-stone-700 transition-colors"
            >
              Sign out
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}

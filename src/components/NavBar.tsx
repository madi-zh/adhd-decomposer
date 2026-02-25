"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";

export default function NavBar() {
  const { data: session } = useSession();

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

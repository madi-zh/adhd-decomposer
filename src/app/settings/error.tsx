"use client";

import Link from "next/link";

export default function SettingsError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center pt-24 text-center">
      <h2 className="text-xl font-semibold text-stone-700 mb-2">
        Could not load settings
      </h2>
      <p className="text-stone-400 mb-6">
        Something went wrong loading your settings.
      </p>
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="py-3 px-6 bg-amber-500 hover:bg-amber-600 text-white font-semibold
                     rounded-2xl transition-all hover:shadow-lg active:scale-[0.98] cursor-pointer"
        >
          Try again
        </button>
        <Link
          href="/"
          className="py-3 px-6 border-2 border-stone-200 text-stone-600 font-semibold
                     rounded-2xl transition-all hover:border-stone-300 inline-block"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}

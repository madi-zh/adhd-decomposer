"use client";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center pt-24 text-center">
      <h2 className="text-xl font-semibold text-stone-700 mb-2">
        Something went wrong
      </h2>
      <p className="text-stone-400 mb-6">
        An unexpected error occurred. Please try again.
      </p>
      <button
        onClick={reset}
        className="py-3 px-6 bg-amber-500 hover:bg-amber-600 text-white font-semibold
                   rounded-2xl transition-all hover:shadow-lg active:scale-[0.98] cursor-pointer"
      >
        Try again
      </button>
    </div>
  );
}

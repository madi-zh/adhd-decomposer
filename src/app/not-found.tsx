import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center pt-24 text-center">
      <h2 className="text-xl font-semibold text-stone-700 mb-2">
        Page not found
      </h2>
      <p className="text-stone-400 mb-6">
        The page you&apos;re looking for doesn&apos;t exist.
      </p>
      <Link
        href="/"
        className="py-3 px-6 bg-amber-500 hover:bg-amber-600 text-white font-semibold
                   rounded-2xl transition-all hover:shadow-lg active:scale-[0.98] inline-block"
      >
        Go home
      </Link>
    </div>
  );
}

export default function LoadingDecompose() {
  return (
    <div className="flex flex-col items-center justify-center pt-24" role="status" aria-label="Loading">
      <div className="relative mb-8">
        <div className="w-16 h-16 border-4 border-stone-200 border-t-amber-500 rounded-full animate-spin" />
      </div>
      <h2 className="text-xl font-semibold text-stone-700 mb-2">
        Breaking this into tiny pieces...
      </h2>
      <p className="text-stone-400 text-sm">Making it impossible not to start</p>
    </div>
  );
}

export default function HistoryLoading() {
  return (
    <div className="flex justify-center pt-24" role="status" aria-label="Loading tasks">
      <div className="w-8 h-8 border-4 border-stone-200 border-t-amber-500 rounded-full animate-spin" />
    </div>
  );
}

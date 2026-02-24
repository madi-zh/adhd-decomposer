interface ProgressBarProps {
  completed: number;
  total: number;
}

export default function ProgressBar({ completed, total }: ProgressBarProps) {
  const percent = total > 0 ? (completed / total) * 100 : 0;

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm text-stone-500">Progress</span>
        <span className="text-sm font-medium text-stone-600">
          {completed} of {total}
        </span>
      </div>
      <div
        className="w-full h-3 bg-stone-200 rounded-full overflow-hidden"
        role="progressbar"
        aria-valuenow={completed}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-label="Task progress"
      >
        <div
          className="h-full bg-emerald-500 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

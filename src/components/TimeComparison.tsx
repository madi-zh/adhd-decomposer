interface TimeComparisonProps {
  estimateMinutes: number;
  actualMinutes: number;
}

function getMessage(
  estimate: number,
  actual: number
): { text: string; color: string } {
  if (actual === 0 && estimate === 0) {
    return { text: "Nice calibration!", color: "text-emerald-600" };
  }

  const diff = (actual - estimate) / Math.max(estimate, 1);

  if (Math.abs(diff) <= 0.2) {
    return { text: "Nice calibration!", color: "text-emerald-600" };
  }
  if (diff < -0.2) {
    return { text: "Faster than you thought!", color: "text-amber-600" };
  }
  return {
    text: "Took a bit longer — now you know for next time.",
    color: "text-stone-500",
  };
}

function formatMinutes(minutes: number): string {
  if (minutes < 1) return "<1 min";
  if (minutes === 1) return "1 min";
  return `${minutes} min`;
}

export default function TimeComparison({
  estimateMinutes,
  actualMinutes,
}: TimeComparisonProps) {
  const { text, color } = getMessage(estimateMinutes, actualMinutes);

  return (
    <div className="w-full max-w-md mx-auto mb-8">
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-stone-50 rounded-2xl p-6 text-center">
          <p className="text-sm text-stone-400 mb-1">Your guess</p>
          <p className="text-3xl font-bold text-stone-800">
            {formatMinutes(estimateMinutes)}
          </p>
        </div>
        <div className="bg-stone-50 rounded-2xl p-6 text-center">
          <p className="text-sm text-stone-400 mb-1">Actual time</p>
          <p className="text-3xl font-bold text-stone-800">
            {formatMinutes(actualMinutes)}
          </p>
        </div>
      </div>
      <p className={`text-center text-sm font-medium ${color}`}>{text}</p>
    </div>
  );
}

interface StepCardProps {
  content: string;
  stepNumber: number;
  total: number;
  onComplete: () => void;
  isCompleting: boolean;
}

export default function StepCard({
  content,
  stepNumber,
  total,
  onComplete,
  isCompleting,
}: StepCardProps) {
  return (
    <div className="flex flex-col items-center">
      <p className="text-sm text-stone-400 mb-4">
        Step {stepNumber} of {total}
      </p>

      <div className="w-full bg-white border-2 border-stone-200 rounded-3xl p-8 mb-6 shadow-sm">
        <p className="text-2xl font-medium text-stone-800 text-center leading-relaxed">
          {content}
        </p>
      </div>

      <button
        type="button"
        onClick={onComplete}
        disabled={isCompleting}
        aria-label={`Mark step ${stepNumber} of ${total} as done`}
        className="w-full py-5 px-6 bg-amber-500 hover:bg-amber-600 active:bg-amber-700
                   disabled:bg-amber-300 text-white font-bold text-xl rounded-2xl
                   transition-all hover:shadow-lg active:scale-[0.98] cursor-pointer
                   disabled:cursor-not-allowed"
      >
        {isCompleting ? "Saving..." : "Done!"}
      </button>
    </div>
  );
}

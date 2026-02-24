import Link from "next/link";

interface TaskHistoryCardProps {
  id: string;
  title: string;
  stepCount: number;
  completedAt: string | null;
  status: string;
}

export default function TaskHistoryCard({
  id,
  title,
  stepCount,
  completedAt,
  status,
}: TaskHistoryCardProps) {
  const isCompleted = status === "completed";
  const dateStr = completedAt
    ? new Date(completedAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  return (
    <Link href={`/task/${id}`}>
      <div
        className="bg-white border border-stone-200 rounded-2xl p-5 hover:border-stone-300
                    hover:shadow-sm transition-all cursor-pointer [content-visibility:auto] [contain-intrinsic-size:0_80px]"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-stone-800 truncate">{title}</h3>
            <p className="text-sm text-stone-400 mt-1">
              {stepCount} steps {dateStr && `\u00B7 ${dateStr}`}
            </p>
          </div>
          <span
            className={`shrink-0 text-xs font-medium px-2.5 py-1 rounded-full ${
              isCompleted
                ? "bg-emerald-50 text-emerald-600"
                : "bg-amber-50 text-amber-600"
            }`}
          >
            {isCompleted ? "Done" : "In progress"}
          </span>
        </div>
      </div>
    </Link>
  );
}

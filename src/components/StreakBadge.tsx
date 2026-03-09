interface StreakBadgeProps {
  currentStreak: number;
  totalXp: number;
}

export default function StreakBadge({
  currentStreak,
  totalXp,
}: StreakBadgeProps) {
  if (currentStreak < 1) return null;

  return (
    <div
      className="flex items-center gap-2 justify-center mb-6"
      aria-label={`Current streak: ${currentStreak} days, ${totalXp} total XP`}
    >
      <span className="text-2xl">🔥</span>
      <span className="text-lg font-bold text-amber-600">
        {currentStreak} day streak
      </span>
      <span className="text-xs bg-stone-100 text-stone-500 px-2 py-0.5 rounded-full ml-2">
        {totalXp} XP
      </span>
    </div>
  );
}

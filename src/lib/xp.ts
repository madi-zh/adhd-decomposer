export const CELEBRATION_THEMES: Record<
  string,
  { minXp: number; colors: string[] }
> = {
  default: { minXp: 0, colors: ["#f59e0b", "#10b981", "#6366f1"] },
  ocean: { minXp: 50, colors: ["#3b82f6", "#06b6d4", "#14b8a6"] },
  sunset: { minXp: 150, colors: ["#f97316", "#ec4899", "#a855f7"] },
  forest: { minXp: 300, colors: ["#22c55e", "#84cc16", "#10b981"] },
  galaxy: {
    minXp: 500,
    colors: ["#a855f7", "#8b5cf6", "#d946ef", "#eab308"],
  },
  rainbow: {
    minXp: 1000,
    colors: ["#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#a855f7"],
  },
};

export function calculateXp(
  stepCount: number,
  currentStreak: number,
  completedBeforeDeadline: boolean
): number {
  const base = 10;
  const stepBonus = stepCount * 2;
  const streakBonus = Math.min(currentStreak * 2, 20);
  const deadlineBonus = completedBeforeDeadline ? 10 : 0;
  return base + stepBonus + streakBonus + deadlineBonus;
}

export function getUnlockedThemes(totalXp: number): string[] {
  return Object.entries(CELEBRATION_THEMES)
    .filter(([, theme]) => totalXp >= theme.minXp)
    .map(([name]) => name);
}

export function getActiveTheme(totalXp: number): {
  name: string;
  colors: string[];
} {
  let active = { name: "default", colors: CELEBRATION_THEMES.default.colors };
  for (const [name, theme] of Object.entries(CELEBRATION_THEMES)) {
    if (totalXp >= theme.minXp) {
      active = { name, colors: theme.colors };
    }
  }
  return active;
}

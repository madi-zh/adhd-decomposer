import {
  CloudSun,
  Sparkles,
  CloudLightning,
  Flame,
  Moon,
  type LucideIcon,
} from "lucide-react";

export interface Mood {
  key: string;
  icon: LucideIcon;
  color: string;
  label: string;
}

export const MOODS: Mood[] = [
  { key: "calm", icon: CloudSun, color: "text-sky-500", label: "Calm" },
  { key: "excited", icon: Sparkles, color: "text-amber-500", label: "Excited" },
  { key: "anxious", icon: CloudLightning, color: "text-violet-500", label: "Anxious" },
  { key: "frustrated", icon: Flame, color: "text-red-500", label: "Frustrated" },
  { key: "tired", icon: Moon, color: "text-indigo-400", label: "Tired" },
];

export const MOOD_MAP: Record<string, Mood> = Object.fromEntries(
  MOODS.map((m) => [m.key, m])
);

export const VALID_MOOD_KEYS = MOODS.map((m) => m.key);

export const VALID_MOOD_KEY_SET: ReadonlySet<string> = new Set(VALID_MOOD_KEYS);

export const DISTRESSED_MOODS = ["anxious", "frustrated", "tired"] as const;
export type DistressedMood = (typeof DISTRESSED_MOODS)[number];

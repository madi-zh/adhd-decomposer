export const MOODS = [
  { key: "calm", emoji: "\u{1F60C}", label: "Calm" },
  { key: "excited", emoji: "\u2728", label: "Excited" },
  { key: "anxious", emoji: "\u{1F630}", label: "Anxious" },
  { key: "frustrated", emoji: "\u{1F624}", label: "Frustrated" },
  { key: "tired", emoji: "\u{1F971}", label: "Tired" },
] as const;

export const MOOD_EMOJIS: Record<string, string> = Object.fromEntries(
  MOODS.map((m) => [m.key, m.emoji])
);

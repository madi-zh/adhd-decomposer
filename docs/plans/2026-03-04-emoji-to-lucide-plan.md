# Emoji to Lucide-React Migration — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace all emoji characters with lucide-react icons for visual consistency and cross-platform reliability.

**Architecture:** Refactor `src/lib/moods.ts` to export `LucideIcon` component references and Tailwind color classes instead of emoji strings. Update three consumer components to render icon components. See `docs/plans/2026-03-04-emoji-to-lucide-design.md` for full design rationale.

**Tech Stack:** lucide-react, React 19, TypeScript, Tailwind CSS 4

---

### Task 1: Install lucide-react

**Step 1: Install the dependency**

Run: `npm install lucide-react`

**Step 2: Verify installation**

Run: `npm ls lucide-react`
Expected: `lucide-react@<version>` listed under dependencies

**Step 3: Commit**

```
git add package.json package-lock.json
git commit -m "Add lucide-react dependency"
```

---

### Task 2: Refactor moods.ts data layer

**Files:**
- Modify: `src/lib/moods.ts` (entire file, 11 lines)

**Step 1: Rewrite moods.ts**

Replace the entire contents of `src/lib/moods.ts` with:

```ts
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
```

Key changes:
- `emoji: string` → `icon: LucideIcon` + `color: string`
- `MOOD_EMOJIS` (Record<string, string>) → `MOOD_MAP` (Record<string, Mood>)
- Exported `Mood` interface for consumers

**Step 2: Verify no type errors in this file**

Run: `npx tsc --noEmit src/lib/moods.ts 2>&1 | head -20`
Expected: Compilation errors in consumer files (MoodCheckIn, Celebration) since they still reference `.emoji` — that's expected at this stage.

**Step 3: Commit**

```
git add src/lib/moods.ts
git commit -m "Refactor moods.ts to use lucide-react icons and color classes"
```

---

### Task 3: Update MoodCheckIn.tsx

**Files:**
- Modify: `src/components/MoodCheckIn.tsx` (lines 72-73)

**Step 1: Update the emoji rendering**

In `src/components/MoodCheckIn.tsx`, find the emoji span inside the mood button map (around line 72-73):

```tsx
<span className="text-3xl" aria-hidden="true">
  {mood.emoji}
</span>
```

Replace with:

```tsx
<mood.icon className={mood.color} size={32} aria-hidden="true" />
```

No other changes needed — the component already imports `MOODS` from `@/lib/moods` and iterates over it.

**Step 2: Verify the build**

Run: `npx tsc --noEmit`
Expected: Remaining errors only in `Celebration.tsx` (still references `MOOD_EMOJIS`)

**Step 3: Commit**

```
git add src/components/MoodCheckIn.tsx
git commit -m "Update MoodCheckIn to render lucide-react mood icons"
```

---

### Task 4: Update Celebration.tsx

**Files:**
- Modify: `src/components/Celebration.tsx` (lines 5, 49, 61-63)

**Step 1: Update imports**

Replace:
```tsx
import { MOOD_EMOJIS } from "@/lib/moods";
```

With:
```tsx
import { MOOD_MAP } from "@/lib/moods";
import { PartyPopper, ArrowRight } from "lucide-react";
```

**Step 2: Replace party popper emoji (line 49)**

Replace:
```tsx
<div className="text-6xl mb-6" role="img" aria-label="Party popper">&#127881;</div>
```

With:
```tsx
<div className="mb-6" role="img" aria-label="Party popper">
  <PartyPopper size={64} className="text-amber-500" />
</div>
```

**Step 3: Replace mood display and arrow (lines 61-63)**

Replace:
```tsx
<span aria-hidden="true">{MOOD_EMOJIS[moodBefore] ?? moodBefore}</span>
<span aria-hidden="true" className="text-stone-300">&rarr;</span>
<span aria-hidden="true">{MOOD_EMOJIS[moodAfter] ?? moodAfter}</span>
```

With:
```tsx
{MOOD_MAP[moodBefore] ? (
  <MOOD_MAP[moodBefore].icon className={MOOD_MAP[moodBefore].color} size={20} aria-hidden="true" />
) : (
  <span aria-hidden="true">{moodBefore}</span>
)}
<ArrowRight size={16} className="text-stone-300" aria-hidden="true" />
{MOOD_MAP[moodAfter] ? (
  <MOOD_MAP[moodAfter].icon className={MOOD_MAP[moodAfter].color} size={20} aria-hidden="true" />
) : (
  <span aria-hidden="true">{moodAfter}</span>
)}
```

Note: The JSX `<MOOD_MAP[key].icon />` pattern won't work directly — you need to assign to a local variable first:

```tsx
{(() => {
  const BeforeIcon = MOOD_MAP[moodBefore]?.icon;
  const AfterIcon = MOOD_MAP[moodAfter]?.icon;
  return (
    <>
      {BeforeIcon ? (
        <BeforeIcon className={MOOD_MAP[moodBefore].color} size={20} aria-hidden="true" />
      ) : (
        <span aria-hidden="true">{moodBefore}</span>
      )}
      <ArrowRight size={16} className="text-stone-300" aria-hidden="true" />
      {AfterIcon ? (
        <AfterIcon className={MOOD_MAP[moodAfter].color} size={20} aria-hidden="true" />
      ) : (
        <span aria-hidden="true">{moodAfter}</span>
      )}
    </>
  );
})()}
```

Alternatively (cleaner): extract the mood icon rendering into local consts before the return statement:

```tsx
const BeforeIcon = moodBefore ? MOOD_MAP[moodBefore]?.icon : null;
const AfterIcon = moodAfter ? MOOD_MAP[moodAfter]?.icon : null;
```

Then in JSX:
```tsx
{BeforeIcon ? (
  <BeforeIcon className={MOOD_MAP[moodBefore!].color} size={20} aria-hidden="true" />
) : (
  <span aria-hidden="true">{moodBefore}</span>
)}
<ArrowRight size={16} className="text-stone-300" aria-hidden="true" />
{AfterIcon ? (
  <AfterIcon className={MOOD_MAP[moodAfter!].color} size={20} aria-hidden="true" />
) : (
  <span aria-hidden="true">{moodAfter}</span>
)}
```

Prefer the second (cleaner) approach.

**Step 4: Verify the build**

Run: `npx tsc --noEmit`
Expected: No type errors

**Step 5: Commit**

```
git add src/components/Celebration.tsx
git commit -m "Update Celebration to use PartyPopper, ArrowRight, and mood icons"
```

---

### Task 5: Update FocusRoomInvite.tsx

**Files:**
- Modify: `src/components/FocusRoomInvite.tsx` (line 16-17)

**Step 1: Add import**

Add at top of file:
```tsx
import { Users } from "lucide-react";
```

**Step 2: Replace emoji**

Replace:
```tsx
<div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center text-3xl mb-6">
  👥
</div>
```

With:
```tsx
<div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mb-6">
  <Users size={32} className="text-emerald-500" />
</div>
```

Note: removed `text-3xl` since lucide uses `size` prop instead.

**Step 3: Verify the build**

Run: `npx tsc --noEmit`
Expected: No type errors

**Step 4: Commit**

```
git add src/components/FocusRoomInvite.tsx
git commit -m "Replace people emoji with Users lucide icon in FocusRoomInvite"
```

---

### Task 6: Final verification

**Step 1: Run linter**

Run: `npm run lint`
Expected: No errors

**Step 2: Run production build**

Run: `npm run build`
Expected: Build succeeds with no errors

**Step 3: Manual visual check**

Run: `npm run dev`
Check these pages in browser:
- Home → create a task → verify mood check-in shows icons with colors
- Complete all steps → verify Celebration shows PartyPopper icon, arrow icon, mood transition icons
- Verify FocusRoomInvite shows Users icon (if body doubling feature is reachable)

**Step 4: Final commit (if any lint/build fixes needed)**

```
git add -A
git commit -m "Fix any lint or build issues from lucide migration"
```

# Emoji to Lucide-React Icon Migration

## Goal

Replace all emoji characters in the codebase with lucide-react icons for visual consistency, better styling control, and cross-platform rendering reliability.

## Decisions

- **Scope**: All emojis (mood selectors, celebration icon, focus room icon, arrows)
- **Mood icon style**: Abstract/symbolic (CloudSun, Sparkles, CloudLightning, Flame, Moon)
- **Colors**: Color-coded per mood (sky, amber, violet, red, indigo)
- **Architecture**: Refactor moods.ts to export LucideIcon references + color strings (Approach 1)

## Icon Mapping

### Mood Icons

| Mood       | Old Emoji | Lucide Icon      | Color Class       |
|------------|-----------|------------------|-------------------|
| Calm       | 😌        | CloudSun         | text-sky-500      |
| Excited    | ✨        | Sparkles         | text-amber-500    |
| Anxious    | 😰        | CloudLightning   | text-violet-500   |
| Frustrated | 😤        | Flame            | text-red-500      |
| Tired      | 🥱        | Moon             | text-indigo-400   |

### Other Icons

| Old           | Lucide Icon  | Color Class      | File                  |
|---------------|-------------|------------------|-----------------------|
| 🎉 (party)   | PartyPopper  | text-amber-500   | Celebration.tsx       |
| → (arrow)     | ArrowRight   | text-stone-300   | Celebration.tsx       |
| 👥 (people)   | Users        | text-emerald-500 | FocusRoomInvite.tsx   |

## Files to Change

| File                              | Changes                                                       |
|-----------------------------------|---------------------------------------------------------------|
| package.json                      | Add lucide-react dependency                                   |
| src/lib/moods.ts                  | emoji string → icon (LucideIcon) + color string, remove MOOD_EMOJIS, add MOOD_MAP |
| src/components/MoodCheckIn.tsx    | Render `<mood.icon>` component instead of emoji text          |
| src/components/Celebration.tsx    | PartyPopper, ArrowRight, icon-based mood display via MOOD_MAP |
| src/components/FocusRoomInvite.tsx| Users icon replacing 👥                                       |

## Files NOT Changing

- MicroRegulation.tsx — no emojis
- StepCard.tsx — no emojis
- NavBar.tsx — no emojis
- GoogleSignInButton.tsx — inline SVG is a brand logo, not an emoji

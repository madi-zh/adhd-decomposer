# Product Improvement Recommendations — Tiny Steps (ADHD Decomposer)

## Executive Summary

Tiny Steps is a well-built MVP with a strong core loop: input a task, get ADHD-friendly micro-steps, tap through them one at a time, celebrate. The foundation is solid — optimistic UI, thoughtful Claude prompting, clean architecture. The recommendations below are organized by impact and effort, focusing on what would most meaningfully improve the experience for people with ADHD.

---

## Priority 1: High Impact, Low Effort

### 1. Skip and Reorder Steps

**Problem:** The current UI forces strictly linear progression. ADHD users often need flexibility — a step might not apply, or they may have already done it, or their energy level makes a different step more approachable right now.

**Recommendation:**
- Add a "Skip this step" secondary button below the "Done!" button on `StepCard`
- Skipped steps get marked with a distinct status (not completed, not blocking)
- Allow returning to skipped steps at the end
- Consider a "This step doesn't apply" option that removes it entirely

**Files affected:** `StepCard.tsx`, `TaskStepController.tsx`, `steps/[id]/route.ts`, `schema.prisma` (add `status` enum to Step)

---

### 2. Undo Last Step Completion

**Problem:** Tapping "Done!" is very easy (by design), which means accidental taps happen. There's no way to go back. This can be frustrating and break trust in the progress tracking.

**Recommendation:**
- Show a brief toast/snackbar after completing a step: "Step completed — Undo"
- The undo window can be 5-8 seconds
- After the window closes, the completion is permanent
- Requires a PATCH endpoint that can set `isCompleted: false`

**Files affected:** `TaskStepController.tsx`, `steps/[id]/route.ts`

---

### 3. "Make It Even Smaller" — Step Refinement

**Problem:** Some generated steps are still too big for a user in a low-executive-function moment. The Claude prompt does a good job, but "Write the first sentence of the email" might still feel overwhelming.

**Recommendation:**
- Add a "Too big? Break it down more" button on the current step card
- Calls Claude with just that single step as input, requesting 3-5 even tinier sub-steps
- Inserts the sub-steps in place of the original step
- This is the single most ADHD-aligned feature the app could add

**Files affected:** `StepCard.tsx`, `TaskStepController.tsx`, new API route or extend `steps/[id]/route.ts`, `claude.ts` (new prompt variant)

---

### 4. Task Deletion

**Problem:** Users cannot delete tasks from their history. Incomplete or irrelevant tasks clutter the history page and can feel like guilt-inducing reminders — a significant issue for ADHD users.

**Recommendation:**
- Add a delete action on `TaskHistoryCard` (with confirmation)
- Add a DELETE endpoint at `api/tasks/[id]`
- Cascade deletes to steps (already configured in Prisma schema)

**Files affected:** `TaskHistoryCard.tsx`, new `api/tasks/[id]/route.ts` DELETE handler, `history/page.tsx`

---

### 5. Encouraging Microcopy and Progress Messaging

**Problem:** The UI is clean but emotionally neutral during the step-by-step flow. ADHD users benefit from frequent positive reinforcement, not just the celebration at the end.

**Recommendation:**
- Show rotating encouragement messages after completing each step: "Nice one!", "Keep going, you're doing great", "One step closer"
- Show progress milestones: "Halfway there!" at 50%, "Almost done!" at 80%
- Add a small animation or transition when a step is marked done (e.g., a subtle checkmark + slide)
- Keep it lightweight — this should feel warm, not patronizing

**Files affected:** `TaskStepController.tsx`, `StepCard.tsx`, `ProgressBar.tsx`

---

## Priority 2: High Impact, Medium Effort

### 6. Resume In-Progress Tasks from Home Page

**Problem:** If a user leaves mid-task, they have to navigate to History, find the task, and click into it. This is a friction point — ADHD users are likely to context-switch frequently.

**Recommendation:**
- On the home page, if the user has an active (incomplete) task, show a prominent "Continue where you left off" card above the task input
- Display the task title, progress (e.g., "5 of 12 steps done"), and a direct link
- Only show the most recent active task to avoid decision paralysis

**Files affected:** `page.tsx` (convert to server component or add data fetch), `api/tasks/route.ts` (add query param for active tasks)

---

### 7. Time Estimates per Step

**Problem:** ADHD users often avoid tasks because they overestimate how long they'll take. Showing that each step is "~1 min" or "~30 sec" makes starting feel less daunting.

**Recommendation:**
- Extend the Claude prompt to return a time estimate with each step (in seconds or minutes)
- Display it subtly on the step card: "~1 min"
- Show total estimated remaining time in the progress bar area
- This directly combats time blindness, a core ADHD challenge

**Files affected:** `claude.ts` (prompt + response schema), `schema.prisma` (add `estimatedSeconds` to Step), `StepCard.tsx`, `ProgressBar.tsx`, task creation API

---

### 8. Search and Filter Task History

**Problem:** The history page lists all tasks with no way to search, filter, or sort. As users accumulate tasks, finding a specific one becomes difficult.

**Recommendation:**
- Add a search bar that filters by task title (client-side for small lists, server-side with pagination for scale)
- Add filter pills: "All", "In Progress", "Completed"
- Sort options: newest first (default), oldest first, alphabetical
- Pagination or infinite scroll when task count exceeds ~50

**Files affected:** `history/page.tsx`, `TaskHistoryCard.tsx`, potentially `api/tasks/route.ts` for server-side filtering

---

### 9. Keyboard Shortcuts

**Problem:** Power users (and users who find mouse interactions effortful) would benefit from keyboard-driven task completion.

**Recommendation:**
- `Enter` or `Space` to mark current step as done
- `Escape` to go back to home
- `?` to show shortcuts overlay
- Visible hint on the step card: "Press Enter to complete"

**Files affected:** `TaskStepController.tsx`, `StepCard.tsx`

---

### 10. Dark Mode

**Problem:** Many ADHD users work in the evening or are sensitive to bright screens. The current all-white/stone design can cause eye strain.

**Recommendation:**
- Add a dark mode toggle in the NavBar
- Store preference in localStorage (and optionally in the user profile)
- Use Tailwind's `dark:` variant for all components
- Respect `prefers-color-scheme` system setting as default

**Files affected:** All component files (Tailwind dark variants), `NavBar.tsx` (toggle), `layout.tsx` (class application)

---

## Priority 3: Medium Impact, Higher Effort

### 11. Recurring / Template Tasks

**Problem:** ADHD users often struggle with the same recurring tasks (morning routine, weekly cleaning, expense reports). Re-entering and re-decomposing the same task is wasteful.

**Recommendation:**
- Allow users to "Save as template" from a completed task
- Templates appear as quick-start options on the home page
- Using a template creates a fresh task instance with the same steps (no Claude API call needed)
- Consider pre-built templates for common ADHD challenges: "Morning routine", "Start work", "Clean kitchen"

**Schema changes:** New `Template` model or a `isTemplate` flag on Task

---

### 12. Daily Focus / Dashboard View

**Problem:** The app is currently single-task oriented. Users with multiple active tasks have no overview of their day.

**Recommendation:**
- Add a `/today` or dashboard page showing all active tasks with their progress
- Allow users to "star" or pin tasks for today
- Show a daily summary: "You completed 23 steps across 3 tasks today"
- Keep it simple — avoid becoming a full project management tool

---

### 13. Step Notes and Context

**Problem:** Some steps benefit from additional context that doesn't fit in a 3-12 word instruction. For example, "Call the dentist" might need the phone number.

**Recommendation:**
- Allow users to add a short note to any step (tap to expand)
- Claude could optionally generate helpful context for complex steps
- Notes are collapsible so the main step text stays clean and scannable

**Schema changes:** Add `note` field to Step model

---

### 14. Streaks and Completion Stats

**Problem:** ADHD users benefit from visual reinforcement of consistency. The history page shows tasks but provides no sense of momentum or achievement over time.

**Recommendation:**
- Track daily active days (any step completed = active day)
- Show a simple streak counter: "3-day streak" on the home page or NavBar
- Weekly summary: "This week: 47 steps completed across 5 tasks"
- Be careful not to make missed days feel punishing — frame it as "You've been active 5 of the last 7 days" rather than "You broke your streak"

---

### 15. Mobile PWA Support

**Problem:** ADHD task management needs to be accessible the moment a task comes to mind — often on a phone. The app works on mobile browsers but isn't installable or offline-capable.

**Recommendation:**
- Add a web app manifest for "Add to Home Screen" on iOS/Android
- Add a service worker for basic offline support (view current task, queue step completions)
- Ensure all touch targets are at least 44x44px (most already are)
- The current responsive design is decent but would benefit from mobile-specific refinements

---

## Technical Improvements That Enable Product Quality

### 16. Rate Limiting on API Endpoints

**Current risk:** No rate limiting means a single user could spam the Claude API (expensive) or brute-force auth endpoints. Add rate limiting to `/api/tasks` (Claude calls), `/api/auth/register`, `/api/auth/forgot-password`.

### 17. Database Indexes

**Current state:** No indexes beyond the primary keys and the `@@unique` constraints. Add indexes on `Task.userId` and `Step.taskId` for query performance as data grows.

### 18. Input Length Validation

**Current state:** The task input has no character limit. An extremely long input could produce unpredictable Claude responses or hit token limits. Add a reasonable max (500-1000 chars) with a character counter in the UI.

### 19. Streaming Task Decomposition

**Current state:** The Claude API call blocks until the full response is ready. With streaming, the UI could show steps appearing one by one — both faster-feeling and more engaging. This also naturally provides a loading experience rather than the static spinner.

### 20. Error Recovery for Partial Failures

**Current state:** If the Claude API returns malformed JSON, the entire task creation fails. Add validation of the Claude response, retry logic for malformed responses, and graceful degradation.

---

## Summary Matrix

| # | Recommendation | Impact | Effort | ADHD-Specific Value |
|---|---------------|--------|--------|-------------------|
| 1 | Skip and reorder steps | High | Low | Flexibility for variable energy |
| 2 | Undo step completion | High | Low | Reduces anxiety from mistakes |
| 3 | "Break it down more" | Very High | Low-Med | Core ADHD need |
| 4 | Task deletion | High | Low | Reduces guilt/clutter |
| 5 | Encouraging microcopy | High | Low | Positive reinforcement |
| 6 | Resume from home page | High | Low-Med | Reduces friction to continue |
| 7 | Time estimates | High | Medium | Combats time blindness |
| 8 | Search/filter history | Medium | Medium | Reduces cognitive load |
| 9 | Keyboard shortcuts | Medium | Low | Reduces effort to act |
| 10 | Dark mode | Medium | Medium | Sensory comfort |
| 11 | Recurring templates | High | Medium | Eliminates repeat setup |
| 12 | Daily focus view | Medium | Medium | Multi-task overview |
| 13 | Step notes | Medium | Low-Med | Context when needed |
| 14 | Streaks and stats | Medium | Medium | Motivation/momentum |
| 15 | Mobile PWA | High | Medium | Capture tasks anywhere |
| 16-20 | Technical improvements | Foundational | Varies | Reliability and scale |

---

## Recommended Implementation Order

**Phase 1 (immediate):** Items 1-5 — Quick wins that meaningfully improve the step-by-step experience, which is where users spend most of their time.

**Phase 2 (next):** Items 6, 3, 7 — Resume flow and "break it down more" address the two biggest drop-off risks (leaving and being stuck). Time estimates address a core ADHD challenge.

**Phase 3 (growth):** Items 8, 10, 11, 15 — Search, dark mode, templates, and PWA make the product stickier for returning users.

**Phase 4 (engagement):** Items 12, 13, 14 — Dashboard, notes, and streaks deepen engagement for active users.

**Ongoing:** Items 16-20 — Technical improvements should be woven into each phase.

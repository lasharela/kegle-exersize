# Fitness Dashboard — Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the single-purpose Kegel PWA into a daily fitness dashboard with a guided strength circuit, warm-up, scheduled running, and Kegel — all driven by a weekly schedule and a coach-tunable config.

**Architecture:** Extend the existing React 19 + TS + Vite PWA. Pure-logic modules (`program`, `schedule`, `progression`) are unit-tested with Vitest. Activity history goes to a new Appwrite `activityLogs` collection; per-exercise progress lives in a `trainingState` JSON field on the profile. Guided players reuse `useTimer`, `useSound` (Web Audio), and `haptics`. Every tunable number lives in `src/lib/program.ts`.

**Tech Stack:** React 19, react-router-dom 7, Tailwind 4, Appwrite, lucide-react, Vitest, vite-plugin-pwa, free-exercise-db (exercise images via CDN).

## Global Constraints

- Exercise names: **English only** (no Russian).
- All program numbers (schedule, reps, sets, rest, ramp steps, running targets, consistency gate) live ONLY in `src/lib/program.ts`. No component hard-codes them.
- iOS audio: use `useSound` (Web Audio + media channel). NEVER reintroduce HTML5 `<audio>` cues or plain Web Audio without the media-channel keepalive. Standalone PWA audio is muted by the silent switch — accepted; show a one-time "ringer on for sound" hint.
- Progression is slow and user-approved (earned, never forced), mirroring the Kegel level-up.
- Follow existing patterns: pages in `src/pages/`, shared UI in `src/components/`, hooks in `src/hooks/`, pure logic in `src/lib/`. Tailwind tokens already defined (`bg`, `surface`, `border`, `text`, `text-dim`, `primary`, `green`, `blue`, `yellow`).
- TDD for every pure-logic module. Commit after each task.

---

## Prerequisite: Appwrite `activityLogs` collection

Before Task 4, create a new Appwrite collection in the same database (via the Coolify-hosted Appwrite console, or an admin script). Document-level permissions enabled.

**Collection id:** `activityLogs` (add `VITE_APPWRITE_ACTIVITYLOGS_COLLECTION` to `.env` and `.env.example`).

**Attributes:**
| key | type | size/required |
|---|---|---|
| userId | string | 64, required |
| date | string | 10, required (`YYYY-MM-DD`) |
| type | string | 16, required (`warmup`/`strength`/`run`) |
| completed | boolean | required |
| durationSec | integer | required, default 0 |
| payload | string | 4000, optional (JSON) |

**Indexes:** `userId` (key), `date` (key). Permissions: document security ON (the app sets per-document user read/update, mirroring the `exercises` collection).

- [ ] Confirm the collection exists and `.env` has `VITE_APPWRITE_ACTIVITYLOGS_COLLECTION`. If you (the agent) lack Appwrite admin access, STOP and ask the user to create it with the schema above.

---

## Task 1: Program config (`program.ts`)

**Files:**
- Create: `src/lib/program.ts`
- Test: `src/lib/program.test.ts`

**Interfaces:**
- Produces:
  - `type Weekday = 0|1|2|3|4|5|6` (0 = Sunday, JS `getDay()`)
  - `type ActivityType = 'kegel'|'warmup'|'strength'|'run'`
  - `interface StrengthExercise { key: string; name: string; mediaKey: string; sets: number; startReps: number; perSide: boolean; rampStep: number; restSec: number }`
  - `interface WarmupMove { key: string; name: string; mediaKey: string; durationSec: number }`
  - `const WEEKLY_SCHEDULE: Record<Weekday, ActivityType[]>`
  - `const WARMUP: WarmupMove[]`
  - `const STRENGTH_CIRCUIT: StrengthExercise[]`
  - `const RUNNING = { startMinutes: 20, rampStepMinutes: 2 }`
  - `const PROGRESSION = { sessionsToRamp: 7, defaultRestSec: 120 }`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest'
import { WEEKLY_SCHEDULE, STRENGTH_CIRCUIT, WARMUP, RUNNING, PROGRESSION } from './program'

describe('program config', () => {
  it('runs Mon/Wed/Fri and strength+warmup Tue/Thu/Sat, kegel daily, Sun rest', () => {
    for (let d = 0; d <= 6; d++) expect(WEEKLY_SCHEDULE[d as 0]).toContain('kegel')
    expect(WEEKLY_SCHEDULE[1]).toContain('run')   // Mon
    expect(WEEKLY_SCHEDULE[2]).toEqual(expect.arrayContaining(['warmup', 'strength'])) // Tue
    expect(WEEKLY_SCHEDULE[3]).toContain('run')   // Wed
    expect(WEEKLY_SCHEDULE[0]).toEqual(['kegel']) // Sun rest
  })

  it('has all 7 strength exercises in English with sets/reps/ramp', () => {
    const keys = STRENGTH_CIRCUIT.map((e) => e.key)
    expect(keys).toEqual(['swing','upright_row','goblet_squat','lunge','overhead_press','pushup','bent_row'])
    const swing = STRENGTH_CIRCUIT[0]
    expect(swing.sets).toBe(3)
    expect(swing.startReps).toBe(15)
    expect(STRENGTH_CIRCUIT.find((e) => e.key === 'pushup')!.startReps).toBe(5)
    STRENGTH_CIRCUIT.forEach((e) => { expect(e.rampStep).toBeGreaterThan(0); expect(e.name).toMatch(/^[\x00-\x7F]+$/) })
  })

  it('exposes warmup moves, running defaults and a 7-session ramp gate', () => {
    expect(WARMUP.length).toBeGreaterThanOrEqual(4)
    expect(RUNNING.startMinutes).toBe(20)
    expect(PROGRESSION.sessionsToRamp).toBe(7)
  })
})
```

- [ ] **Step 2: Run test, verify it fails** — `npx vitest run src/lib/program.test.ts` → FAIL (module missing).

- [ ] **Step 3: Implement `program.ts`**

```ts
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6 // 0 = Sunday (JS getDay)
export type ActivityType = 'kegel' | 'warmup' | 'strength' | 'run'

export interface StrengthExercise {
  key: string; name: string; mediaKey: string
  sets: number; startReps: number; perSide: boolean; rampStep: number; restSec: number
}
export interface WarmupMove { key: string; name: string; mediaKey: string; durationSec: number }

export const PROGRESSION = { sessionsToRamp: 7, defaultRestSec: 120 }
export const RUNNING = { startMinutes: 20, rampStepMinutes: 2 }

const R = PROGRESSION.defaultRestSec

export const STRENGTH_CIRCUIT: StrengthExercise[] = [
  { key: 'swing',         name: 'Kettlebell swing', mediaKey: 'kettlebell_swing', sets: 3, startReps: 15, perSide: false, rampStep: 3, restSec: R },
  { key: 'upright_row',   name: 'Upright row',      mediaKey: 'upright_row',      sets: 1, startReps: 12, perSide: false, rampStep: 2, restSec: R },
  { key: 'goblet_squat',  name: 'Goblet squat',     mediaKey: 'goblet_squat',     sets: 1, startReps: 12, perSide: false, rampStep: 2, restSec: R },
  { key: 'lunge',         name: 'Lunge',            mediaKey: 'lunge',            sets: 1, startReps: 8,  perSide: true,  rampStep: 1, restSec: R },
  { key: 'overhead_press',name: 'Overhead press',   mediaKey: 'overhead_press',   sets: 1, startReps: 10, perSide: false, rampStep: 2, restSec: R },
  { key: 'pushup',        name: 'Push-up',          mediaKey: 'pushup',           sets: 1, startReps: 5,  perSide: false, rampStep: 1, restSec: R },
  { key: 'bent_row',      name: 'Bent-over row',    mediaKey: 'bent_over_row',    sets: 1, startReps: 12, perSide: true,  rampStep: 2, restSec: R },
]

export const WARMUP: WarmupMove[] = [
  { key: 'arm_circles',   name: 'Arm circles',        mediaKey: 'arm_circles',   durationSec: 30 },
  { key: 'band_pulls',    name: 'Band pull-aparts',   mediaKey: 'band_pull_apart', durationSec: 40 },
  { key: 'bw_squats',     name: 'Bodyweight squats',  mediaKey: 'bodyweight_squat', durationSec: 40 },
  { key: 'hip_openers',   name: 'Hip openers',        mediaKey: 'hip_circle',    durationSec: 40 },
  { key: 'kb_halos',      name: 'Kettlebell halos',   mediaKey: 'kettlebell_halo', durationSec: 40 },
]

export const WEEKLY_SCHEDULE: Record<Weekday, ActivityType[]> = {
  0: ['kegel'],                          // Sun — rest
  1: ['kegel', 'run'],                   // Mon
  2: ['kegel', 'warmup', 'strength'],    // Tue
  3: ['kegel', 'run'],                   // Wed
  4: ['kegel', 'warmup', 'strength'],    // Thu
  5: ['kegel', 'run'],                   // Fri
  6: ['kegel', 'warmup', 'strength'],    // Sat
}
```

- [ ] **Step 4: Run test, verify pass.**
- [ ] **Step 5: Commit** — `git add src/lib/program.ts src/lib/program.test.ts && git commit -m "feat(program): coach-tunable Phase 1 config"`

---

## Task 2: Schedule engine (`schedule.ts`)

**Files:**
- Modify: `src/lib/types.ts` (add the `ActivityLog` interface here so this task and Task 4 share it)
- Create: `src/lib/schedule.ts`
- Test: `src/lib/schedule.test.ts`

> Add to `types.ts` first: `import type { ActivityType } from './program'` then
> `export interface ActivityLog { $id: string; userId: string; date: string; type: ActivityType; completed: boolean; durationSec: number; payload?: string }`.
> Task 4 reuses this exact interface (do not redefine it there).

**Interfaces:**
- Consumes: `WEEKLY_SCHEDULE`, `ActivityType` from `program.ts`; `Exercise` (Kegel) + new `ActivityLog` from `types.ts`.
- Produces:
  - `activitiesForDate(dateISO: string): ActivityType[]`
  - `weeklyProgress(args: { logs: ActivityLog[]; kegelDates: string[]; weekStartISO: string; today: string }): { done: number; total: number }`
  - `weekStartISO(today: string): string` (Monday of today's week)

- [ ] **Step 1: Write failing tests** (covering: Tuesday → `['kegel','warmup','strength']`; Sunday → `['kegel']`; `weeklyProgress` counts scheduled activity-days completed in the current week; Monday-start week boundary).

```ts
import { describe, it, expect } from 'vitest'
import { activitiesForDate, weeklyProgress, weekStartISO } from './schedule'

describe('activitiesForDate', () => {
  it('returns the weekday activities (2026-06-30 is a Tuesday)', () => {
    expect(activitiesForDate('2026-06-30')).toEqual(['kegel', 'warmup', 'strength'])
  })
  it('Sunday is rest + kegel only (2026-06-28)', () => {
    expect(activitiesForDate('2026-06-28')).toEqual(['kegel'])
  })
})

describe('weekStartISO', () => {
  it('returns Monday for a mid-week date', () => {
    expect(weekStartISO('2026-07-01')).toBe('2026-06-29') // Wed -> Mon
  })
})

describe('weeklyProgress', () => {
  it('counts distinct completed activity-days scheduled this week', () => {
    const r = weeklyProgress({
      logs: [{ date: '2026-06-30', type: 'strength', completed: true } as any],
      kegelDates: ['2026-06-29', '2026-06-30'],
      weekStartISO: '2026-06-29', today: '2026-06-30',
    })
    expect(r.done).toBeGreaterThan(0)
    expect(r.total).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 2: Run, verify fail.**
- [ ] **Step 3: Implement.** Use `new Date(dateISO + 'T00:00:00')` for stable local parsing; `getDay()` for weekday; `weekStartISO` shifts back to Monday. `weeklyProgress.total` = count of scheduled non-kegel slots Mon→today plus kegel-per-day; `done` = matching completed logs + kegel completions. Keep it simple and deterministic; document the formula in a comment.
- [ ] **Step 4: Run, verify pass.**
- [ ] **Step 5: Commit** — `feat(schedule): weekly schedule + progress engine`

---

## Task 3: Generalize progression (`progression.ts`)

**Files:**
- Modify: `src/lib/progression.ts`
- Test: `src/lib/progression.test.ts` (add cases; keep existing Kegel tests green)

**Interfaces:**
- Produces (new, additive — do NOT remove `daysCompletedThisLevel`/`canLevelUp`):
  - `consistentSessions(logs: ActivityLog[], opts: { type: ActivityType; sinceISO: string }): number` — distinct dates with a completed log of `type` on/after `sinceISO`.
  - `shouldRamp(logs: ActivityLog[], opts: { type: ActivityType; sinceISO: string }): boolean` — `consistentSessions >= PROGRESSION.sessionsToRamp`.

- [ ] **Step 1: Add failing tests** for `consistentSessions` (distinct days, ignores other types/incomplete/older than since) and `shouldRamp` (true at 7).
- [ ] **Step 2: Run, verify fail.**
- [ ] **Step 3: Implement** the two functions using the existing distinct-day Set pattern; import `PROGRESSION` from `program.ts`.
- [ ] **Step 4: Run full suite, verify all green.**
- [ ] **Step 5: Commit** — `feat(progression): generic consistency gate for activities`

---

## Task 4: Types + activity-log data layer + training state

**Files:**
- Modify: `src/lib/types.ts` (extend `Profile` with `trainingState?: string`; `ActivityLog` was already added in Task 2 — reuse it)
- Modify: `src/lib/appwrite.ts` (export `ACTIVITYLOGS_COLLECTION` from env)
- Create: `src/lib/activity-log.ts` (`logActivity`, `listActivityLogs`)
- Create: `src/lib/training-state.ts` (`TrainingState` type, `defaultTrainingState()`, `parseTrainingState(profile)`, `currentReps(state, exerciseKey)`)
- Test: `src/lib/training-state.test.ts`

**Interfaces:**
- Produces:
  - `interface ActivityLog { $id: string; userId: string; date: string; type: ActivityType; completed: boolean; durationSec: number; payload?: string }`
  - `interface TrainingState { strength: Record<string, number>; runMinutes: number; levelStart: Record<string, string> }` (reps per exercise key; run target; per-activity ISO date the current level started — for the consistency gate)
  - `defaultTrainingState(todayISO: string): TrainingState` — seeds reps from `STRENGTH_CIRCUIT[].startReps`, `runMinutes` from `RUNNING.startMinutes`, `levelStart` for `strength`/`run` = today.
  - `parseTrainingState(profile: Profile, todayISO: string): TrainingState` — JSON-parse `profile.trainingState`, falling back to default (and merging any missing exercise keys).
  - `logActivity(p: { userId: string; type: ActivityType; completed: boolean; durationSec: number; payload?: object }): Promise<void>`
  - `listActivityLogs(userId: string, limit?: number): Promise<ActivityLog[]>`

- [ ] **Step 1: Write failing tests** for `defaultTrainingState` (reps match program start values; pushup = 5) and `parseTrainingState` (bad/empty JSON → defaults; missing keys merged from program).
- [ ] **Step 2: Run, verify fail.**
- [ ] **Step 3: Implement** the modules. `activity-log.ts` mirrors `Exercise` creation in `Exercise.tsx` (`databases.createDocument` with `Permission.read/update(Role.user(userId))`, `date = new Date().toISOString().split('T')[0]`). `listActivityLogs` uses `Query.equal('userId', …)`, `Query.orderDesc('date')`, `Query.limit(limit ?? 100)`.
- [ ] **Step 4: Run, verify pass.**
- [ ] **Step 5: Commit** — `feat(data): activity log + training state`

---

## Task 5: Routing & navigation (Kegel → /kegel, Dashboard at /)

**Files:**
- Modify: `src/App.tsx` (routes), `src/components/Header.tsx` (nav)
- Create: `src/pages/Dashboard.tsx` (shell — filled in Task 10)

**Interfaces:**
- Consumes: `activitiesForDate` (Task 2). Produces the route table the players plug into.

- [ ] **Step 1:** Add routes: `/` → `Dashboard`, `/kegel` → existing `Exercise`, `/warmup` → `Warmup`, `/strength` → `Strength`, `/run` → `Run`, keep `/settings`, `/login`. Create stub pages for Warmup/Strength/Run returning a titled placeholder so the app compiles.
- [ ] **Step 2:** Update `Header.tsx`: the top-right circle navigates to `/settings` (unchanged); add a home affordance (tapping the points/streak area, or a small home icon) that navigates to `/`. From `/settings` the X returns to `/` (already does).
- [ ] **Step 3:** Build (`npm run build`) — verify it compiles and the Kegel flow still works at `/kegel`.
- [ ] **Step 4: Commit** — `feat(nav): dashboard routing, kegel at /kegel`

---

## Task 6: Exercise media resolver (`exercise-media.ts`)

**Files:**
- Create: `src/lib/exercise-media.ts`

**Interfaces:**
- Produces: `mediaUrl(mediaKey: string): string` — returns a free-exercise-db image URL, with a local fallback icon for unknown keys.

free-exercise-db serves images at `https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/<ExerciseId>/0.jpg`. The full index is `https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json`.

- [ ] **Step 1:** Fetch the index once (during development), pick the best-matching `id` for each `mediaKey` used in `program.ts` (swing, upright row, goblet squat, lunge, overhead press, push-up, bent-over row, band pull-apart, bodyweight squat, arm circles, hip circle, kettlebell halo). Hard-code the resulting `mediaKey → exerciseId` map in `exercise-media.ts` (a static object) so runtime needs no index fetch.
- [ ] **Step 2:** `mediaUrl(mediaKey)` returns `https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/${ID_MAP[mediaKey]}/0.jpg`, or `'/icon-192.png'` when unmapped.
- [ ] **Step 3:** Eyeball each URL in a browser to confirm it shows the right movement; adjust IDs. (If a move has no good match — e.g. kettlebell halo — fall back to the closest or the icon, and note it.)
- [ ] **Step 4: Commit** — `feat(media): exercise image resolver via free-exercise-db`

---

## Task 7: Strength circuit player (`/strength`)

**Files:**
- Create: `src/pages/Strength.tsx`, `src/hooks/useCircuit.ts`, `src/components/RestTimer.tsx`, `src/components/ExerciseCard.tsx`
- Modify: `src/lib/exercise-engine.ts` only if a shared rest-timer helper is extracted (optional)

**Interfaces:**
- Consumes: `STRENGTH_CIRCUIT`, `parseTrainingState`, `currentReps`, `mediaUrl`, `useSound`, `haptics`, `logActivity`, `shouldRamp`.
- Produces: a guided session that logs `type:'strength'` and offers a circuit level-up.

**Behavior (the core feature):**
- Build a flat ordered list of "steps" from `STRENGTH_CIRCUIT`: for each exercise, repeat `sets` times → an exercise step `{ exercise, setIndex, reps }`, with a rest step `{ restSec }` after every set except the very last step.
- `useCircuit.ts` holds: `stepIndex`, `phase: 'exercise'|'rest'|'done'`, advance/skip, and a rest countdown using `useTimer` (reuse `TICK_MS`). On entering a rest step, start countdown; at zero, `fastBeep()` + `breakBuzz()` and auto-advance. `Done set` button on an exercise step advances.
- `ExerciseCard`: shows `mediaUrl(exercise.mediaKey)` image (with `onError` → fallback icon), English name, "Set X of N", and reps (`perSide ? \`${reps} / side\` : reps`).
- `RestTimer`: big countdown, Skip + +15s buttons.
- On `done`: `logActivity({ userId, type:'strength', completed:true, durationSec, payload:{ reps: currentRepsByKey } })`; then if `shouldRamp(logs, { type:'strength', sinceISO: state.levelStart.strength })`, show a "Level up your circuit?" confirm that bumps each exercise's reps by `rampStep`, writes `trainingState`, and resets `levelStart.strength` to today (reuse the Kegel CompletionOverlay pattern; a dedicated overlay is fine).
- Cap UI media height; portrait-friendly; reuse existing button styles.

- [ ] **Step 1:** Write `useCircuit.ts` with a small pure helper `buildSteps(circuit, repsByKey)` and a unit test for it (step count = Σ sets, rests = steps−1, reps resolved per exercise). Run/fail/implement/pass.
- [ ] **Step 2:** Build `RestTimer` + `ExerciseCard` components.
- [ ] **Step 3:** Build `Strength.tsx` wiring `useCircuit`, sound, haptics, media, and the start gesture (`initAudio()` on the first Start tap, like `Exercise.tsx`).
- [ ] **Step 4:** Add the log write + ramp offer.
- [ ] **Step 5:** `npm run build`; manually click through in the browser.
- [ ] **Step 6: Commit** — `feat(strength): guided circuit player with media, rest, progression`

---

## Task 8: Warm-up player (`/warmup`)

**Files:**
- Create: `src/pages/Warmup.tsx` (reuse `ExerciseCard`, `RestTimer` patterns or a simple per-move countdown)

**Interfaces:** Consumes `WARMUP`, `mediaUrl`, `useSound`, `haptics`, `logActivity`.

- [ ] **Step 1:** Sequential player: for each `WARMUP` move show media + name + a `durationSec` countdown (reuse the timer pattern); chime/haptic on each transition; `initAudio()` on Start.
- [ ] **Step 2:** On finish, `logActivity({ type:'warmup', completed:true, durationSec })`.
- [ ] **Step 3:** Build; click through.
- [ ] **Step 4: Commit** — `feat(warmup): guided warm-up player`

---

## Task 9: Running timer (`/run`)

**Files:**
- Create: `src/pages/Run.tsx`

**Interfaces:** Consumes `parseTrainingState` (`runMinutes`), `useSound`, `logActivity`, `shouldRamp`.

- [ ] **Step 1:** Show target = `state.runMinutes` min. Start → count-up timer (mm:ss) with Pause/Finish. Optional: a soft chime each minute.
- [ ] **Step 2:** Finish → `logActivity({ type:'run', completed:true, durationSec })`; then `shouldRamp(logs,{type:'run',sinceISO:state.levelStart.run})` → offer "+2 min next target", bumping `runMinutes` and resetting `levelStart.run`.
- [ ] **Step 3:** Build; click through.
- [ ] **Step 4: Commit** — `feat(run): scheduled running timer with slow ramp`

---

## Task 10: Dashboard (`/`)

**Files:**
- Modify: `src/pages/Dashboard.tsx`
- Create: `src/components/ActivityCard.tsx`, `src/components/StatsHeader.tsx`

**Interfaces:** Consumes `activitiesForDate`, `weeklyProgress`, `listActivityLogs`, Kegel `exercises`, `useAuth` (streak), `navigate`.

**Layout (approved "stats header + today"):**
- `StatsHeader`: 🔥 streak (from `useAuth().streakDays`), 🏃 runs-this-week, 🏋️ strength-this-week (counts from logs).
- Today list: for each `activitiesForDate(today)` render an `ActivityCard` (icon, label, subtitle, Start button → its route). Kegel subtitle shows `Level N · target` via `levels.ts`. Mark a card done when a matching completed log/exercise exists for today.
- `weeklyProgress` bar (`done/total`).

- [ ] **Step 1:** Build `ActivityCard` + `StatsHeader`.
- [ ] **Step 2:** Build `Dashboard.tsx`: load today's logs + recent Kegel exercises on mount; compute cards, stats, weekly bar.
- [ ] **Step 3:** Build; verify each card routes correctly and completion checks appear after finishing an activity.
- [ ] **Step 4: Commit** — `feat(dashboard): today view with stats + weekly progress`

---

## Task 11: Seed training state + Settings additions

**Files:**
- Modify: `src/context/AuthContext.tsx` (seed `trainingState` once, like the `migratedTo100` guard), `src/pages/Settings.tsx` (show run/strength current targets; optional manual adjust)

- [ ] **Step 1:** In `AuthContext`, after profile loads, if `profile.trainingState` is empty, write `JSON.stringify(defaultTrainingState(today))` once (guarded by a localStorage flag like the existing reset).
- [ ] **Step 2:** In Settings, add a read-only "Training" section showing current circuit reps and run target (and the X/7 consistency for strength/run, reusing `consistentSessions`). Manual ± is optional/nice-to-have.
- [ ] **Step 3:** Build; verify.
- [ ] **Step 4: Commit** — `feat(training): seed state + settings summary`

---

## Task 12: Ringer-on hint + manifest/name polish

**Files:**
- Create: `src/components/RingerHint.tsx`
- Modify: `src/pages/Dashboard.tsx` (mount hint), `vite.config.ts` (PWA `name`/`short_name` → app name), `index.html` title

- [ ] **Step 1:** `RingerHint`: a dismissible one-time banner (localStorage flag) shown in standalone mode (`window.matchMedia('(display-mode: standalone)').matches`) reading: "For sound, turn your ringer on — iOS mutes web apps on silent." 
- [ ] **Step 2:** Update PWA `name`/`short_name`/`description` and `index.html` `<title>` to the app's new identity (placeholder: "Daily Fitness"; confirm with user).
- [ ] **Step 3:** `npm test` (all green) + `npm run build`.
- [ ] **Step 4: Commit** — `feat(polish): ringer hint + app naming`

---

## Final verification

- [ ] `npm test` — all suites green.
- [ ] `npm run build` — clean tsc + Vite build.
- [ ] Manual browser pass: dashboard shows the correct day's activities; strength/warmup/run players run with media + cues; logs persist; weekly bar updates; ramp offer appears after the consistency gate.
- [ ] Deploy (`npx wrangler deploy`) only after user review.
- [ ] **End-of-phase coach pass:** run a coach subagent with the user's profile + `program.ts` to tune starting reps/ramps/schedule, editing only `program.ts`.

## Notes / deferred

- Nutrition, weight tracking, calorie targets → Phase 2.
- Mobility / 3 reel exercises → Phase 3.
- Live in-app AI coach → Phase 3.
- App + repo + (optional) domain rename → end of Phase 1, per user.

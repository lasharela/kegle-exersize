# Fitness Dashboard — Phase 1 (Workouts)

**Date:** 2026-06-26
**Status:** Draft for review
**Pivot:** Evolve the single-purpose Kegel PWA into a multi-activity daily fitness tracker. Kegel becomes one card among several. See [[project_kegle_vision]].

## User profile (drives the program defaults)

- Male, age 43, 100 kg, 189 cm. Goal: lose ~10 kg (→ 90 kg). Cardio-focused, knee/age-cautious about running.
- Equipment: 40 lb / 18 kg kettlebell; TRX resistance band (5–15 lb, blue).
- Philosophy: start gentle, increase slowly, "earned not forced."

## Phase scope

- **Phase 1 (this spec):** Dashboard + weekly schedule + Warm-up + Strength circuit (guided, with media + progression) + Running (scheduled, timed) + Kegel folded in as a daily card.
- **Phase 2 (separate spec):** Nutrition / calorie logging + weight tracking toward the goal.
- **Phase 3 (separate spec):** Mobility module (3 Instagram-reel exercises) + optional live AI coach.

## Architecture

Extend the existing app (React 19 + TS + Vite PWA, Tailwind 4, Appwrite, Cloudflare). Reuse:
- The tick/timer engine pattern (`useTimer`), audio engine (`useAudioEngine`) and haptics (`haptics.ts`) from the Kegel work for rest-timer cues and rep prompts.
- The consistency-gated progression pattern (`progression.ts`) generalized to any activity.

### Information architecture (routing)

- `/` → **Dashboard** (new home).
- `/kegel` → existing Kegel exercise flow (moved from `/`).
- `/warmup` → guided warm-up player.
- `/strength` → guided strength-circuit player.
- `/run` → running session (timer).
- `/settings` → existing settings (gains program/schedule controls).

A bottom nav or header links Dashboard / Settings. The current `Header` is updated; the Kegel-specific UI is unchanged internally, just relocated.

### Coach-tunable configuration (single source of truth)

All program numbers live in one typed module `src/lib/program.ts`:

```
WEEKLY_SCHEDULE: which activity types run on which weekday
WARMUP: ordered warm-up moves (name, mediaKey, durationSec | reps)
STRENGTH_CIRCUIT: ordered exercises (name, ru, mediaKey, sets, startReps, perSide, rampStep, restSec)
RUNNING: startMinutes, rampStepMinutes
PROGRESSION: sessionsToRamp (consistency gate), default restSec
```

No component hard-codes a number. A **coach subagent** (run at the end of Phase 1, and re-runnable later) edits only this file to tune starting reps, ramp steps, rest, and schedule to the user's stats and progress. This keeps "the coach modifies the numbers" a config edit, not a code change.

## Data model

Keep the existing `Profiles` and `Exercises` (Kegel) collections untouched.

**New Appwrite collection `activityLogs`:**
| field | type | notes |
|---|---|---|
| userId | string | owner |
| date | string | `YYYY-MM-DD` |
| type | string | `warmup` \| `strength` \| `run` |
| completed | boolean | finished vs partial |
| durationSec | integer | session length |
| payload | string (JSON) | per-type details (e.g. strength: reps done per exercise; run: minutes) |

**Profile gains one attribute** `trainingState` (string, JSON): current per-exercise reps + per-activity consistency counters + current running target. Defaults are seeded from `program.ts` on first load (lazy migration, guarded like the Kegel `migratedTo100` reset).

Rationale: one flexible log collection + one JSON state field avoids a schema explosion while supporting heterogeneous activities. History queries filter by `type`.

## Modules

### 1. Schedule engine — `src/lib/schedule.ts` (pure, tested)
- `activitiesForDate(date, schedule): ActivityType[]` — Kegel always included; warm-up + strength + run per `WEEKLY_SCHEDULE`.
- Default schedule: **Run** Mon/Wed/Fri, **Strength** (with warm-up) Tue/Thu/Sat, **Kegel** daily, Sun rest.
- `weeklyProgress(logs, schedule, weekStart)` → `{done, total}` for the "This week" bar.

### 2. Dashboard — `src/pages/Dashboard.tsx`
- **Stats header:** current streak (🔥), runs-this-week, strength-sessions-this-week.
- **Today list:** one card per scheduled activity (Kegel, Warm-up, Strength, Run) with a Start button and a done check once logged today.
- **This-week bar:** `done/total` scheduled sessions.
- Reads today's `activityLogs` + Kegel `Exercises` to mark completion.

### 3. Warm-up player — `src/pages/Warmup.tsx`
- Guided, ~4 min. Ordered moves from `program.WARMUP`, e.g. arm circles, band pull-aparts (TRX), bodyweight squats, hip openers, kettlebell halos.
- Each move shows media + name + a duration countdown (or rep count), audio/haptic cue on transition. Logs `type: warmup` on finish.

### 4. Strength circuit player — `src/pages/Strength.tsx`
- The core new feature. One pass through `program.STRENGTH_CIRCUIT`.
- **Per exercise:** large demo image (from media DB), exercise name (EN + RU), the target reps for *this* exercise at the user's current level, and a "Done set" button.
- **Sets:** each exercise has a `sets` count (swings = 3, the rest = 1 by default). The player loops the sets of an exercise before advancing to the next.
- **Between every set and every exercise:** a rest timer (default 120 s, from `restSec`) with skip/extend, audio + haptic cue at zero — reusing `useAudioEngine` / `haptics`.
- On finish: write an `activityLogs` strength entry (reps per exercise from `trainingState`), then evaluate progression (below).
- Default circuit (start values; 18 kg KB unless noted):

  | # | Exercise (EN) | RU | Start | Ramp |
  |---|---|---|---|---|
  | 1 | Kettlebell swing | Свинги | 3×15 | +3 swings |
  | 2 | Upright row | Протяжка | 12 | +2 |
  | 3 | Goblet squat | Приседания | 12 | +2 |
  | 4 | Lunge | Выпады | 8 / leg | +1 / leg |
  | 5 | Overhead press | Жим над головой | 10 | +2 |
  | 6 | Push-up (knees OK) | Анжуманя | 5 | +1 |
  | 7 | Bent-over row | Тяга к поясу | 12 / side | +2 / side |

  (Swings stored as 3 sets of 15; the "reps" shown ramps slowly. All numbers are coach-tunable.)

### 5. Running session — `src/pages/Run.tsx`
- Simple, low-pressure: a count-up (or target-down) timer for an easy run/walk. Target minutes come from `trainingState.runMinutes` (start 20, ramp +2 slowly).
- Start → timer + optional interval chime (walk/run) → Finish logs `type: run` with `durationSec`. No GPS in Phase 1.

### 6. Kegel integration
- Existing flow moves to `/kegel`; appears as the daily Dashboard card. No internal change to the Kegel engine.

### 7. Progression engine — generalize `src/lib/progression.ts`
- Extract a generic `consistentSessions(logs, {type, since})` → distinct qualifying days/sessions.
- `shouldRampStrength(state, logs)` → true when `consistentSessions >= PROGRESSION.sessionsToRamp` since the last ramp.
- On ramp: bump each exercise's reps by its `rampStep` (slow), reset the counter, and surface a "Level up your circuit?" confirm (earned, user-approved — same pattern as Kegel). Running ramps the same way.

## Exercise media

Use an open, MIT-licensed exercise image set (e.g. `yuhonas/free-exercise-db`, served via CDN, or `wger`). Each program exercise carries a `mediaKey` mapping to a specific demo image (start/end frames). A small `src/lib/exercise-media.ts` resolves `mediaKey → URL`. Images are remote (CDN) to keep the bundle small; a static fallback icon covers load failures. Each mapping is verified to match the intended movement during implementation.

## Testing

- Vitest unit tests for the pure modules: `schedule.ts` (per-weekday activities, weekly progress), generalized `progression.ts` (consistency gate, ramp trigger), and any reps-state helpers.
- Manual iPhone PWA pass: dashboard shows correct day's activities; strength player advances with media + rest timers + cues; logs persist; progression offer appears after the consistency gate.

## Out of scope (Phase 1)

- Food/calorie logging, weight tracking, calorie targets (Phase 2).
- Mobility / reel exercises (Phase 3).
- Live in-app AI coach (Phase 3); Phase 1 uses the config-edit coach pass.
- GPS/route tracking for runs.

## End-of-phase coach pass

After Phase 1 is built and verified, run a coach subagent with the user's profile + the `program.ts` defaults. It reviews and adjusts starting reps, ramp steps, rest, and the weekly schedule for a sustainable ~0.75–1 kg/week trajectory (paired with Phase 2 diet), editing only `program.ts`.

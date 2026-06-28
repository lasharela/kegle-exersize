# Task 11 & 12 Implementation Report

## Commit Hashes

- Task 11 `feat(training): seed state + settings summary` — `83bafa0`
- Task 12 `feat(polish): ringer hint + app naming` — `8414093`

## Test / Build Results

Both tasks: `npm test` 37/37 passed, `npm run build` succeeded (tsc clean, vite 1.5s, PWA generated).

## Files Changed

### Task 11

| File | Change |
|------|--------|
| `src/context/AuthContext.tsx` | Added `import { defaultTrainingState }` and a new seeding `useEffect` gated on `profile?.trainingState` absence + `kegle.trainingSeeded` localStorage flag |
| `src/pages/Settings.tsx` | Added imports (`consistentSessions`, `parseTrainingState`, `STRENGTH_CIRCUIT`, `PROGRESSION`, `listActivityLogs`, `ActivityLog`); added `activityLogs` state; added activity-logs fetch `useEffect`; computed `today`, `trainingState`, `strengthSessions`, `runSessions`; added read-only "Training" section between Level and This Week |

### Task 12

| File | Change |
|------|--------|
| `src/components/RingerHint.tsx` | New component — standalone-mode-only, dismissible ringer banner, persists via `kegle.ringerHintDismissed` |
| `src/pages/Dashboard.tsx` | Imported and mounted `<RingerHint />` above `<StatsHeader />` |
| `vite.config.ts` | PWA manifest: `name → "Daily Fitness"`, `short_name → "Fitness"`, `description → "Daily fitness: kegel, strength, warm-up and running"` |
| `index.html` | `<title>` changed to `"Daily Fitness"` |

---

## Final-Review Fix: C1 — Local Calendar Day (post-task patch)

### Summary

Activity logs were stamped with a UTC date (`new Date().toISOString().split('T')[0]`) which can shift the calendar day for users ahead of UTC (e.g. UTC+4). Several pages also duplicated the inline `${y}-${m}-${day}` formula independently.

### Changes

| File | Change |
|------|--------|
| `src/lib/date.ts` | New helper `localDateISO(d?)` using `getFullYear/getMonth/getDate` (local, not UTC) |
| `src/lib/date.test.ts` | New test — verifies June and January formatting with explicit local `new Date(year, monthIdx, day)` |
| `src/lib/activity-log.ts` | Import `localDateISO`; replace `new Date().toISOString().split('T')[0]` with `localDateISO()` |
| `src/pages/Dashboard.tsx` | Import `localDateISO` + `STRENGTH_CIRCUIT`; replace inline today formula; derive strength card subtitle as `` `${STRENGTH_CIRCUIT.length} moves · ~25 min` `` |
| `src/pages/Strength.tsx` | Import `localDateISO`; collapse 4-line `useMemo` to `useMemo(() => localDateISO(), [])` |
| `src/pages/Run.tsx` | Import `localDateISO`; same 1-line `useMemo` replacement |
| `src/pages/Settings.tsx` | Import `localDateISO`; replace `const d = new Date(); const today = ...` with `const today = localDateISO()` |
| `src/context/AuthContext.tsx` | Import `localDateISO`; training-state seeding effect: replace 3-line inline formula with `const today = localDateISO()` |

### Test / Build Results

- **Test command**: `npm test -- --run`
- **Test files run**: `src/lib/date.test.ts`, `src/lib/levels.test.ts`, `src/lib/training-state.test.ts`, `src/lib/progression.test.ts`, `src/lib/schedule.test.ts`, `src/hooks/useCircuit.test.ts`, `src/lib/exercise-engine.test.ts`, `src/lib/program.test.ts`
- **Result**: 8 test files, 38 tests — all passed
- **Build**: `npm run build` — tsc clean, vite 1.70s, PWA generated

---

## Concerns / Notes

- The `border-yellow/40` class used in RingerHint relies on Tailwind opacity modifier; works with v3+ and the existing tailwind setup.
- `navigator.standalone` cast uses `unknown as { standalone: boolean }` to avoid `any` lint warning.
- The seeding effect is keyed on `[profile?.$id, profile?.trainingState]` — same pattern as the migration effect — so it fires once per profile load and never loops even if `updateProfile` triggers a re-render.
- No tests were added for React components (no jsdom/testing-library in this project); all 37 unit tests cover the lib layer.

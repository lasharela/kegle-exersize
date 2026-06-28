# Task 7 Report — Guided Strength Circuit Player

## Files Created / Modified

| File | Action |
|------|--------|
| `src/hooks/useCircuit.test.ts` | Created — TDD test written first |
| `src/hooks/useCircuit.ts` | Created — `buildSteps` pure helper + `useCircuit` hook |
| `src/components/ExerciseCard.tsx` | Created — exercise media, name, set label, rep target |
| `src/components/RestTimer.tsx` | Created — mm:ss countdown, Skip, +15s |
| `src/pages/Strength.tsx` | Replaced stub — full circuit player |

## Test Summary

```
Test Files  7 passed (7)
Tests       37 passed (37)    ← includes 2 new buildSteps tests
```

New tests in `src/hooks/useCircuit.test.ts`:
- `expands sets into exercise steps with rests between every step` — verifies 9 exercise + 8 rest steps, last step is exercise
- `uses reps from the map, falling back to startReps` — swing→30 from map, pushup→5 from startReps

## Build

`npm run build` — clean, 0 errors, 0 warnings. Bundle: 402.55 kB JS / 19.74 kB CSS.

## Architecture Notes

- `buildSteps` is a pure function with no React dependency — easily testable.
- `useCircuit` uses `useCallback` for stable `next()` reference (safe as effect dep).
- Rest countdown: `useTimer` decrements `restRemaining`; a separate effect watches for `restRemaining === 0 && isRestActive` to auto-advance.
- `useElapsed(phase === 'running')` retains elapsed when phase flips to 'done' — durationSec is captured via ref at completion time.
- Today is computed as local YYYY-MM-DD (not `toISOString` which would give UTC).
- `updateProfile` in AuthContext already calls `refreshProfile` internally; the extra `refreshProfile()` call in `handleLevelUp` is per-spec and is harmless.

## Concerns

None blocking. One minor note: `useCircuit` resets to index 0 on mount only — there is no restart button in the UI, which matches the spec. If a restart feature is added later, `useCircuit` will need a `reset()` callback.

## Fix — rest auto-skip on entry (review follow-up)

**Bug:** Every rest step was skipped instantly. On the rest-entry render
`isRestActive` flipped to true while `restRemaining` was still the stale 0
(initial state / leftover from the previous rest). The auto-advance effect
re-ran that render with closure `restRemaining === 0` and called `next()`
before the init effect's `setRestRemaining(step.restSec)` could re-render.

**Fix:** Added `restTickedRef` (useRef). The init effect resets it to `false`
on rest entry; the `useTimer` tick sets it `true`; the auto-advance effect now
bails unless `restTickedRef.current` is true. Effects fire in declaration
order (init before auto-advance), so the ref is reset before the guard checks
it on every rest entry, including subsequent rests. Skip (`handleSkipRest`)
and +15s (`handleAddTime`) are unchanged and still work.

No new automated test: covering this needs `@testing-library/react` + fake
timers (not a current dependency); verified by reasoning through effect order
plus full `npm test` (37 passed) and clean `npm run build`.

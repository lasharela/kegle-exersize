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

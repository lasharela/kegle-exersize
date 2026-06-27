# Kegle Exercise — Levels + iOS Haptics/Sound

**Date:** 2026-06-26
**Status:** Approved

## Goal

Improve the Kegel-trainer PWA before re-deploying to production:

1. A gentle **level ladder** so the user starts light and ramps up, instead of hard-starting at 400.
2. Leveling that is **earned through a consistent week**, not a single completion.
3. A **reliable iOS audio + haptic engine**, fixing the long-standing "sounds feel missing / lag" problem (iOS Safari throttles rapid `Audio.play()`; `navigator.vibrate()` is absent on iOS).

> Note: prior commits ("Fix iPhone sound lag", "revert sound to HTML Audio") show Web Audio was attempted and reverted once. This design leans on a dedicated haptic library for the rapid-pulse feedback so we are not depending on fragile rapid audio playback.

## Non-goals (this iteration)

- The future "multifunctional tracker" pivot (Kegel as one module of many). Tracked separately; do not build it here, but do not actively block it.
- Visual theme redesign, new badges, cloud-sync changes.

## 1. Level Ladder

Fixed ascending ladder:

```
100, 150, 200, 250, 300, 350, 400, 450, 500   (steps of 50)
600, 700, 800, 900, 1000                       (steps of 100)
1200, 1400, 1600, 1800, 2000                   (steps of 200)
```

- 19 levels. Top of ladder = 2000 (no auto-progression beyond it).
- `Profile.currentTarget` (already exists) remains the source of truth. The **level index** is derived by locating `currentTarget` in the ladder (`LEVELS.indexOf`). If a legacy target is not on the ladder, snap to the nearest ladder value at or below it.
- New-user default target changes from `400` to `100` (in `AuthContext` profile creation).
- The existing user's profile is reset to `100` once (manual one-time update; total pulses/points history retained).

### Module: `src/lib/levels.ts`
- `LEVELS: number[]` — the ladder above.
- `levelIndex(target: number): number` — index of target (nearest-at-or-below if off-ladder).
- `nextTarget(target): number | null` — next rung, or `null` at the top.
- `prevTarget(target): number | null` — previous rung, or `null` at the bottom.
- `levelNumber(target): number` — 1-based level for display.
- Pure functions, unit-tested.

## 2. Consistency-Gated Leveling

**Rule:** unlock the next level after completing the full current target on **7 distinct days** at the current level.

- "At the current level" = exercise records whose `date` is on/after `Profile.weekStartDate` AND (`completed === true`) AND `targetPulses === currentTarget`.
- `weekStartDate` is re-stamped to today on every level-up (it already exists and is already used this way for manual progression).
- **Distinct-day count** = number of unique `date` values matching the rule. Multiple sessions on one day count once.
- When count reaches **7**: the completion overlay shows an *"Advance to level N (target M)?"* offer with Accept / Not yet. Accepting calls the same progression action as the manual control.
- Declining keeps them at the current level; the offer reappears on future completions while still ≥7.

### Module: `src/lib/progression.ts`
- `daysCompletedThisLevel(exercises, profile): number` — distinct qualifying days.
- `canLevelUp(exercises, profile): boolean` — `daysCompletedThisLevel >= 7 && nextTarget != null`.
- Pure functions, unit-tested.

### Leveling actions (replace `handleWeekProgression` in `Settings.tsx`)
- `levelUp()` — set `currentTarget = nextTarget`, `currentWeek += 1`, `weekStartDate = today`.
- `levelDown()` — set `currentTarget = prevTarget`, `weekStartDate = today` (manual only; does not decrement `currentWeek` below 1).
- Manual ↑ / ↓ controls in Settings, plus a live **"X/7 days this week → level up"** indicator.
- The old "7 days *elapsed*" gate (`daysSinceStart >= 7`) is removed in favor of the completed-days gate.

## 3. Sound + Haptic Engine

Two cooperating pieces, both armed by the existing **Start** tap (the required iOS user gesture):

### Haptics — `ios-vibrator-pro-max`
- Add the dependency; import once at app startup to install the `navigator.vibrate` polyfill on iOS.
- Wrapper `src/lib/haptics.ts`:
  - `haptic(pattern: number | number[])` — guarded `navigator.vibrate(...)` call; no-op if unavailable or disabled by user setting.
  - Named helpers: `pulseTap()` (short), `squeezeBuzz()`, `releaseBuzz()`, `breakBuzz()`, `completeCelebrate()` (pattern).
- The library's audio trick also emits a subtle click, so each pulse is tactile **and** audible from one well-tested library — this is the primary rapid-pulse feedback (not rapid mp3/oscillator playback).

### Musical sound — Web Audio synth `src/hooks/useAudioEngine.ts`
- Replaces `useSound.ts` and the 5 mp3 files.
- One lazily-created `AudioContext`, resumed on Start.
- Short oscillator-based cues:
  - `squeezeChime()` — ascending two-tone.
  - `releaseChime()` — descending two-tone.
  - `breakSound()` — soft mid tone.
  - `completionFanfare()` — short arpeggio.
- Used for **phase transitions only** (warmup squeeze/release, breaks, completion) — low frequency events, so no iOS throttling risk. The rapid per-pulse feedback comes from the haptic library, not this engine.
- No `fastBeep` mp3 spam during pulses; per-pulse feedback = `pulseTap()` haptic (+ its inherent click).

### User setting
- Add `soundEnabled` and `hapticsEnabled` toggles in Settings (default both on). Stored in `localStorage` (no Appwrite schema change needed). The engine/haptic helpers respect them.

### Integration in `Exercise.tsx`
- On phase change: play the matching chime **and** fire the matching haptic.
- On each pulse tick increment: `pulseTap()` haptic only (drop the per-pulse mp3 beep).
- On completion: `completionFanfare()` + `completeCelebrate()` haptic.

## 4. Other Improvements

- **Light start:** for targets ≤ 250, skip the long warmup (Phase 2: 10s×5). Engine routes `breakA → pulse_tick` directly when `targetPulses <= 250`. Short warmup (Phase 1) is kept.
- **Level display:** show current level number and "X/7 days → next" progress on the Exercise screen header and in Settings stats.

## Data / Migration

- No Appwrite collection schema changes. Level derives from `currentTarget`; weekly progress derives from exercise history + `weekStartDate`; toggles live in `localStorage`.
- `AuthContext` new-profile default: `currentTarget: 100`.
- One-time: reset the existing user's `currentTarget` to `100`.

## Testing

- Unit tests (Vitest) for `levels.ts` and `progression.ts` (ladder edges, off-ladder snapping, distinct-day counting, 7-day gate).
- Manual verification on iPhone Safari/PWA: haptics fire, chimes play on transitions, no audio lag during pulses, level-up offer appears at 7/7.

## Deploy

- `npm run build` → `npx wrangler deploy` (Cloudflare Workers static assets; `wrangler.jsonc` already serves `./dist` as SPA). Confirm with user before pushing live.

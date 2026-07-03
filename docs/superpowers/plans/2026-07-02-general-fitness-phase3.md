# General Fitness Phase 3 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix production data logging + PWA sound, add session exit safety, all-activity streak with purchasable shields, weight tracking, Apple-Health walk bridge, and two new strength exercises; deploy to Cloudflare.

**Architecture:** Extend the existing React 19 + TS + Vite PWA. All new logic lands in pure, Vitest-tested modules (`streak.ts`, `weight-log.ts`, `program.ts` config); UI consumes them via existing patterns (AuthContext, ActivityCard). Appwrite gains one collection (`weightLogs`); `activityLogs` gets its ID actually wired in. Sound keeps the HTML-Audio architecture (Web Audio is banned — iOS silent-switch regression) with standalone-PWA hardening.

**Tech Stack:** React 19, react-router-dom 7, Tailwind 4, Appwrite (self-hosted), Vitest, vite-plugin-pwa, Cloudflare Workers (wrangler).

## Global Constraints

- **Never use Web Audio API** — HTML `<audio>` + `audioSession='playback'` only (regressed twice on iOS silent switch).
- Exercise names: English only.
- All tunable numbers live in `src/lib/program.ts` (coach-tunable config).
- Dates are local `YYYY-MM-DD` via `localDateISO()` — never `toISOString()`.
- Existing Vitest suite must stay green; `npm run lint` and `tsc -b` clean.
- `STREAK_EPOCH = '2026-07-02'`, `SHIELDS = {cost: 25, max: 3}`, `POINTS = {warmup: 1, strength: 3, run: 3}`, `WEIGHT = {startKg: 100, goalKg: 90}`.

---

### Task 1: Appwrite schema + env (manual, via console in Chrome)

**Files:** Modify `.env`, `.env.example`

- [ ] Open `https://appwrite-console.lasharela.com` in the user's Chrome (claude-in-chrome; session expected). Project `699bc6f70004116e14ec`, database `kegel`.
- [ ] Verify collection `activityLogs` exists; create if missing: attributes userId (string 64, req), date (string 10, req), type (string 16, req), completed (bool, req), durationSec (int, req), payload (string 4096, optional); indexes on userId, date; document security ON.
- [ ] Create collection `weightLogs`: userId (string 64, req), date (string 10, req), kg (float, req); indexes userId, date; document security ON.
- [ ] Create API key `shortcuts-bridge` scoped to `documents.write` (or narrowest available databases write scope). Save the secret for Task 10's doc (hand to user, do not commit).
- [ ] Set `VITE_APPWRITE_ACTIVITYLOGS_COLLECTION=activityLogs` and add `VITE_APPWRITE_WEIGHTLOGS_COLLECTION=weightLogs` in `.env` and `.env.example`.
- [ ] Fallback if console session unavailable: ssh sweenk, locate Appwrite via Coolify/docker, use server-side access to create an API key, then create collections via REST.

### Task 2: Program config additions

**Files:** Modify `src/lib/program.ts`, `src/lib/types.ts`

**Produces:** `POINTS`, `SHIELDS`, `WEIGHT`, `STREAK_EPOCH` consts; `ActivityType` includes `'walk'`; two new `STRENGTH_CIRCUIT` entries (`kb_deadlift`, `suitcase_carry`), warm-up `band_pullapart`.

- [ ] Add to `program.ts`:

```ts
export type ActivityType = 'kegel' | 'warmup' | 'strength' | 'run' | 'walk'
export const POINTS: Partial<Record<ActivityType, number>> = { warmup: 1, strength: 3, run: 3 }
export const SHIELDS = { cost: 25, max: 3 }
export const WEIGHT = { startKg: 100, goalKg: 90 }
export const STREAK_EPOCH = '2026-07-02'
```

- [ ] Append to `STRENGTH_CIRCUIT` (before core finisher): `{ key: 'kb_deadlift', name: 'Kettlebell deadlift', mediaKey: 'kb_deadlift', sets: 1, startReps: 12, perSide: false, rampStep: 2, restSec: R }` and `{ key: 'suitcase_carry', name: 'Suitcase carry', mediaKey: 'suitcase_carry', sets: 1, startReps: 30, perSide: true, rampStep: 5, restSec: R, isHold: true }`.
- [ ] Append to `WARMUP`: `{ key: 'band_pullapart', name: 'Band pull-apart', mediaKey: 'band_pullapart', durationSec: 30 }`.
- [ ] `WEEKLY_SCHEDULE` type stays `ActivityType[]` — 'walk' never scheduled. Run `npm run test` + `tsc -b`; fix type fallout (e.g. `ACTIVITY_ICON` map in Dashboard gains `walk: '🚶'`).
- [ ] Commit `feat(program): points/shields/weight config + kb deadlift, suitcase carry, band pull-apart`.

### Task 3: Streak engine with shields (TDD)

**Files:** Create `src/lib/streak.ts`, `src/lib/streak.test.ts`

**Interfaces — Produces:**

```ts
export function isDayComplete(date: string, kegelDates: Set<string>, logs: ActivityLog[]): boolean
export function computeStreak(args: {
  kegelDates: Set<string>; logs: ActivityLog[]; shieldsUsed: string[];
  shieldsOwned: number; today: string;
}): { streak: number; consume: string[] }
```

Rules: pre-`STREAK_EPOCH` days are complete iff kegel done that day; from epoch on, every activity in `activitiesForDate(date)` must be done (kegel via `kegelDates`, others via a completed log of that type+date). Anchor = today if complete else yesterday (an in-progress today never zeroes the streak). Walk backwards; complete or already-shielded days extend the streak; a gap of N unshielded incomplete days is bridged (and its dates returned in `consume`) only when N ≤ remaining shields AND the day beyond the gap is complete/shielded. 365-day iteration cap.

- [ ] Write failing tests covering: simple chain; today-incomplete anchors at yesterday; pre-epoch kegel-only; post-epoch requires all scheduled (e.g. Tue with kegel done but strength missing → incomplete); shielded day extends; gap of 1 with 1 shield bridges and returns consume date; gap of 2 with 1 shield breaks with `consume: []`; gap adjacent to dead history (nothing complete beyond) does not consume.
- [ ] Run `npx vitest run src/lib/streak.test.ts` → FAIL (module missing). Implement. Run → PASS.
- [ ] Commit `feat(streak): all-activity streak with shield bridging`.

### Task 4: Weight log module (TDD for pure part)

**Files:** Create `src/lib/weight-log.ts`, `src/lib/weight-log.test.ts`; modify `src/lib/appwrite.ts` (export `WEIGHTLOGS_COLLECTION`), `src/lib/types.ts` (`WeightLog` interface)

**Produces:**

```ts
export interface WeightLog { $id: string; userId: string; date: string; kg: number }
export async function logWeight(userId: string, kg: number, date?: string): Promise<void> // upsert by (userId,date)
export async function listWeights(userId: string, limit?: number): Promise<WeightLog[]> // date desc
export function movingAverage(entries: { date: string; kg: number }[], window?: number): { date: string; kg: number }[] // entries date-asc, 7-day trailing
```

- [ ] TDD `movingAverage` (empty, shorter-than-window, exact window). Appwrite fns mirror `activity-log.ts` (try/catch, `Permission.read/update(Role.user(userId))`; upsert = query `[equal userId, equal date, limit 1]` → update else create).
- [ ] Commit `feat(weight): weight log module`.

### Task 5: AuthContext streak/shields rework + points on completion

**Files:** Modify `src/context/AuthContext.tsx`, `src/pages/{Warmup,Strength,Run}.tsx`, `src/pages/Exercise.tsx` (UTC→local date fix in `saveExercise`)

**Produces (context additions):** `streakDays: number` (now all-activity), `shieldSavedDates: string[]` (consumed during this load), `buyShield(): Promise<void>`.

- [ ] Replace `fetchStreak` with `fetchStreakAndShields(userId, profileDoc)`: fetch kegel exercises (completed, limit 100) + `listActivityLogs`, run `computeStreak` with the profile's `shieldsOwned/shieldsUsed`; when `consume.length`, persist `{shieldsOwned: owned - consume.length, shieldsUsed: [...used, ...consume]}` and set `shieldSavedDates`.
- [ ] `buyShield()`: guard `totalPoints >= SHIELDS.cost && shieldsOwned < SHIELDS.max`; updateProfile `{totalPoints: -cost, shieldsOwned: +1}`.
- [ ] In Warmup/Strength/Run completion effects, after `logActivity(...)` add `updateProfile({ totalPoints: profile.totalPoints + POINTS[type]! })` (once per completion — guard with a ref if the effect can refire).
- [ ] `Exercise.tsx saveExercise`: `date: localDateISO()` instead of `toISOString().split('T')[0]`.
- [ ] Existing tests green; commit `feat(streak): wire all-activity streak + shields + activity points`.

### Task 6: Session exit guard + End control + safe-area

**Files:** Create `src/context/SessionGuardContext.tsx`; modify `src/App.tsx` (provider), `src/components/Header.tsx`, `src/pages/{Strength,Warmup,Run,Exercise}.tsx`, `index.html` (viewport-fit=cover), `src/index.css` (safe-area padding)

**Produces:**

```ts
export function useSessionGuard(guard: { active: boolean; onExit: () => void | Promise<void> } ): void
export function useRequestExit(): (to: string) => void // navigates directly when no active guard
```

Provider owns `guardRef` + confirm-sheet state; renders the confirm sheet ("End session? Your progress will be saved as partial." / Keep going · End session). While a guard is active it pushes a history sentinel and intercepts `popstate` (re-push + open sheet). Confirm → `await onExit()` → navigate.

- [ ] Header Back + avatar/settings buttons route through `useRequestExit`.
- [ ] Each session page registers while running and adds a small ✕ End button (top-right of the running screen) calling `useRequestExit('/')`:
  - Strength `onExit`: `logActivity({type:'strength', completed:false, durationSec: elapsedRef.current, payload:{reps: repsByKey, stoppedAtStep: index}})`
  - Warmup `onExit`: partial log `{type:'warmup', completed:false, durationSec}`
  - Run `onExit`: partial log `{type:'run', completed:false, durationSec}`
  - Exercise (kegel) `onExit`: call existing `stop()` and stay (engine completes + saves)
- [ ] `index.html`: `viewport-fit=cover`; header gets `padding-top: env(safe-area-inset-top)`; app root bottom inset.
- [ ] Commit `feat(ui): session exit guard, partial logging, End control, safe-area insets`.

### Task 7: Audio hardening + diagnostics panel

**Files:** Modify `src/lib/audio-session.ts`, `src/hooks/useSound.ts`, `src/main.tsx`, `vite.config.ts` (`define: { __BUILD_TIME__ }`), `src/vite-env.d.ts`; create `src/components/SoundDiagnostics.tsx`, `public/silence-10s.wav` (generated: 10 s, 8 kHz mono 8-bit PCM); modify `src/pages/Settings.tsx`

- [ ] `audio-session.ts`: add `initAudioLifecycle()` — prime at call + on `visibilitychange(visible)`/`pageshow` re-prime and restart keep-alive; keep-alive uses `/silence-10s.wav`; export `keepAliveState(): { exists: boolean; paused: boolean; currentTime: number }`. Call `initAudioLifecycle()` in `main.tsx`.
- [ ] `useSound.createAudio`: append elements to `document.body` (hidden) — iOS standalone reliability.
- [ ] Generate the wav with a small node one-liner (RIFF header + zero samples), verify with `afinfo`.
- [ ] `SoundDiagnostics.tsx` (collapsible in Settings): standalone mode?, `audioSession` present + type, keep-alive state (1 s refresh), one test button per sound (uses `useSound`, calls `initAudio` first), build stamp `__BUILD_TIME__`.
- [ ] Commit `fix(audio): standalone-PWA hardening + sound diagnostics panel`.

### Task 8: Dashboard/UI — shields, banner, walk card, weight card

**Files:** Modify `src/components/StatsHeader.tsx`, `src/pages/Dashboard.tsx`, `src/pages/Settings.tsx`

- [ ] StatsHeader: add 🛡×owned next to streak (hidden at 0).
- [ ] Dashboard: banner when `shieldSavedDates.length` ("🛡 A shield saved your streak (Jul 1)"); Walk card under stats when a `type:'walk'` log exists (latest: steps from payload, minutes); Weight card (latest kg, Δ to `WEIGHT.goalKg`, → `/weight`).
- [ ] Settings: "Streak shields" section — owned/max, cost, Buy button via `buyShield()` (disabled with reason); show Account ID (`user.$id`) under account section (needed for the Shortcut setup).
- [ ] Commit `feat(dashboard): shields UI, shield-saved banner, walk + weight cards`.

### Task 9: Weight page + chart

**Files:** Create `src/pages/Weight.tsx`, `src/components/WeightChart.tsx`; modify `src/App.tsx` (route `/weight`)

- [ ] **Load the dataviz skill before writing chart code** (required trigger).
- [ ] Weight.tsx: numeric input (step 0.1, kg) + Save (`logWeight`, optimistic refresh); list/chart of `listWeights` (asc for chart). WeightChart: pure SVG — daily points, 7-day `movingAverage` line, dashed goal line at 90, y-domain = min(data,goal)-1..max(data,start)+1, x = date index, ~90 recent entries.
- [ ] Commit `feat(weight): weight page with trend chart`.

### Task 10: Shortcuts walk bridge doc

**Files:** Create `docs/shortcuts-walk-bridge.md`

- [ ] Step-by-step personal-automation Shortcut: Find Health Samples (Steps, today, sum) + (Walking+Running Distance optional) → Get Contents of URL: `POST https://appwrite.lasharela.com/v1/databases/kegel/collections/activityLogs/documents`, headers `X-Appwrite-Project: 699bc6f70004116e14ec`, `X-Appwrite-Key: <from Task 1>`, `Content-Type: application/json`; JSON body `{"documentId":"walk-<Current Date yyyy-MM-dd>","data":{"userId":"<Account ID from Settings>","date":"<yyyy-MM-dd>","type":"walk","completed":true,"durationSec":0,"payload":"{\"steps\":<steps>}"},"permissions":["read(\"user:<Account ID>\")","update(\"user:<Account ID>\")"]}`; nightly automation 23:30, "Run Immediately"; rerun-safe (409 = already logged).
- [ ] Commit `docs: Apple Health walk bridge via iOS Shortcuts`.

### Task 11: Media for new exercises

**Files:** Modify `src/lib/exercise-media.ts`, `src/components/ExerciseMedia.tsx`

- [ ] Source demo media for `kb_deadlift`, `suitcase_carry`, `band_pullapart` — prefer local looping mp4 style; else static image from free-exercise-db CDN; else icon fallback. Extend `exercise-media.ts` with an image map (`mediaUrl` returns `{kind:'video'|'image'|'fallback', url}` or keep string + `hasVideo`/`hasImage` helpers) and render `<img>` in `ExerciseMedia` for image kind.
- [ ] Commit `feat(media): demos for new exercises (image fallback support)`.

### Task 12: Verify + deploy + smoke

- [ ] `npm run test` (all green), `npm run lint`, `npm run build` (env complete — grep `dist/assets/*.js` for `activityLogs` + `weightLogs`).
- [ ] E2E on `npm run dev` with desktop Chrome (chrome-devtools MCP) using a throwaway test account against prod Appwrite: register/login → dashboard renders (walk/weight cards, no console errors) → weight entry saves + chart renders → buy-shield disabled state correct → start strength → header Back shows End-session confirm → End logs partial (`completed:false` in Appwrite) → sound diagnostics panel renders.
- [ ] `npx wrangler deploy`; fetch prod bundle, confirm collection IDs baked; load prod URL; smoke: login page 200, manifest OK.
- [ ] Update memory files; report to user (include: what to test on iPhone — reinstall PWA, sound diagnostics readout, Shortcut setup steps).

## Self-review

Spec coverage: §0→T1, §1→T7, §2→T6, §3→T2/3/5/8, §4→T4/8/9, §5→T2/10 (+walk card T8), §6→T2/11, §7→T12. Types consistent (`computeStreak` consumed in T5; `POINTS` in T5; `movingAverage` in T9). No placeholders — media sourcing in T11 has an explicit fallback chain.

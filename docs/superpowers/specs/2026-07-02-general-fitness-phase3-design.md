# General Fitness — Phase 3 (streaks, shields, weight, walks, fixes)

**Date:** 2026-07-02
**Status:** Approved (user answered decision questions in session; execution authorized end-to-end including deploy)

## Goal

Finish the pivot from "kegel trainer" to a general daily fitness tracker for weight loss:
fix the broken data plumbing and PWA sound, make sessions exit-safe, generalize points +
streak across all activities with purchasable streak shields, add weight tracking toward
90 kg, ingest daily walks from Apple Health via an iOS Shortcuts bridge, and expand the
strength circuit. Deploy to production (Cloudflare Workers).

## User decisions (recorded)

1. **Sound symptom:** silent in installed PWA even with mute switch off; the same build in
   Safari browser works. Historically sound worked in PWA but inconsistently, with delay.
2. **Exercises stay hardcoded** in `program.ts` — no in-app editor.
3. **Streak rule:** a day counts only if **all scheduled activities** that day are done.
   Shields are **bought with points**, max 3 held, auto-consumed to cover missed days.
4. **Weight:** manual entry in the app (no smart scale).
5. **Walks:** iOS Shortcuts → Appwrite bridge approved. Capacitor wrapper parked (Phase 4
   option if sound/haptics stay unacceptable).
6. Media: user accepts current mp4s (good free video is scarce/expensive); new exercises
   get best-available free media or icon fallback.

## 0. Data plumbing fix (prerequisite, production bug)

The deployed bundle was built with `VITE_APPWRITE_ACTIVITYLOGS_COLLECTION` **empty** — all
warm-up/strength/run logging has been silently failing in production (`logActivity`
catches and console-errors). Fix:

- Verify/create Appwrite collection `activityLogs` (schema per Phase 1 plan: userId s64,
  date s10, type s16, completed bool, durationSec int, payload s4096; indexes userId,
  date; document security ON).
- New collection `weightLogs`: userId (s64, required), date (s10, required), kg (float,
  required). Indexes: userId, date. Document security ON.
- Fill both IDs in `.env` / `.env.example`. Deploys bake env at build time on this machine.
- Create a scoped Appwrite API key (`databases.write` least-scope available) for the
  Shortcuts bridge.

Admin access: Appwrite console `appwrite-console.lasharela.com` via the user's Chrome
session (claude-in-chrome); fallback ssh sweenk.

## 1. Sound hardening + diagnostics (PWA-only silence)

Keep the HTML-Audio architecture (Web Audio stays banned — silent-switch regression,
twice). Standalone-specific hardening, all best-effort:

- Prime `navigator.audioSession = 'playback'` at app startup (main.tsx) and re-prime on
  `visibilitychange`/`pageshow`, not only inside `initAudio`.
- Attach the `Audio` elements to the DOM (`document.body`) — known iOS standalone quirk.
- Replace the keep-alive `silence.wav` with a longer (~10 s) silent file so loop-gap
  doesn't release the audio session; re-start keep-alive on visibility return.
- **Diagnostics panel in Settings** (collapsible "Sound diagnostics"): shows standalone
  mode?, `audioSession` API present + current type, keep-alive playing + currentTime
  advancing, per-sound test buttons, app build timestamp. This turns the next on-device
  report into an exact diagnosis instead of another guess.

## 2. Session exit guard (the "no back button" complaint)

Problem: during an active session, header Back / iOS swipe-back silently abandons the
workout — nothing logged, progress lost.

- New `SessionGuardContext`: session pages (`Strength`, `Warmup`, `Run`, `Exercise`)
  register `{active, onExit}` while running.
- Header Back consults the guard: if active, show a confirm sheet — "End session? Your
  progress will be saved as partial." Confirm → log partial (`completed:false`,
  `durationSec`, partial payload) → navigate home.
- `popstate` during an active session: re-push state and open the same confirm sheet.
- Add an explicit ✕ End control on session screens so exiting is always visibly possible.
- Safe-area: `viewport-fit=cover` + `env(safe-area-inset-*)` padding on the header so the
  Back button is never under the notch/status bar in standalone.

## 3. Points + all-activity streak + shields

**Points** (in `program.ts`): kegel keeps `floor(pulses/100)`; completing warmup +1,
strength +3, run +3. Walks give 0 (passive). Points accrue to `Profile.totalPoints`.

**Streak** (`src/lib/streak.ts`, pure + tested): a day is *complete* when every scheduled
activity (per `WEEKLY_SCHEDULE`) is done — kegel from the `exercises` collection, others
from `activityLogs`. Days before `STREAK_EPOCH = '2026-07-02'` use the kegel-only rule
(activity logs didn't persist before; don't nuke the user's current streak). Current
streak = consecutive complete-or-shielded days ending today (or yesterday, if today is
still in progress — today no longer zeroes the streak at breakfast).

**Shields:** `SHIELD_COST = 25` points, `MAX_SHIELDS = 3` held. Bought in Settings.
Auto-consume: on dashboard load, walk back from the streak anchor; a gap of N missed,
unshielded days is covered only if N ≤ shields owned **and** the day beyond the gap is
complete (never waste shields on a dead streak). Consumption = `shieldsOwned - n`,
`shieldsUsed += dates` (both fields already exist on Profile), surfaced with a small
"🛡 shield saved your streak" banner. Pure function returns `{streak, consume: dates[]}`;
AuthContext persists.

Header/StatsHeader/CompletionOverlay switch from the kegel-only streak to this one;
StatsHeader also shows 🛡 × owned.

## 4. Weight tracking

- `weightLogs` collection (above). `src/lib/weight-log.ts`: `logWeight(kg)` (upsert by
  date), `listWeights(userId, limit)`.
- Dashboard **Weight card**: shows latest weight + delta to 90 kg goal; tapping opens
  `/weight`.
- `/weight` page: quick numeric entry (kg, 0.1 step) for today; simple SVG chart — daily
  points, 7-day moving-average line, goal line at `WEIGHT.goalKg = 90` (config in
  `program.ts` with `startKg = 100`). No chart library.

## 5. Walks — iOS Shortcuts bridge

- Walk entries land in `activityLogs` as `type: 'walk'` (`durationSec` = walking minutes
  × 60, `payload = {steps}`), custom document id `walk-YYYY-MM-DD` so the nightly
  automation is idempotent (409 on rerun = already logged).
- Personal iOS Shortcut (user sets up once, ~10 min): Find Health Samples (steps, today)
  → Get Contents of URL POST to Appwrite REST with the scoped API key. Exact steps,
  URL, headers, JSON in `docs/shortcuts-walk-bridge.md`.
- Dashboard **Walk card** (informational, unscheduled, not in streak): latest walk's
  steps/minutes.

## 6. Strength circuit additions (hardcoded)

Append to `STRENGTH_CIRCUIT`: KB deadlift (12, +2), suitcase carry (30 s/side hold, +5,
uses `isHold` + `perSide`). Warm-up gains band pull-apart (30 s). Media: best free
source (free-exercise-db photos) or icon fallback via existing `exercise-media.ts`
(extended to support static images).

## 7. Testing & deploy

- Vitest: `streak.ts` (epoch rule, shields consume/skip/dead-streak, anchor today-vs-
  yesterday), points, weight moving-average helper. Existing suite stays green.
- Browser E2E on dev server (desktop Chrome, real Appwrite backend, test account):
  dashboard, weight entry + chart, shield buy, session exit confirm + partial log.
- Deploy: `npm run build` (env now complete) + `npx wrangler deploy`; verify the prod
  bundle contains the collection IDs; smoke test production URL.

## Out of scope

- Capacitor/native wrapper, HealthKit direct access, real timer-driven haptics (iOS
  18.4+ requires a tap within ~1 s — platform wall; haptics stay tap-driven only).
- Nutrition/calorie logging. In-app exercise editor. Media replacement for existing mp4s.
- GPS run tracking.

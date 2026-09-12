# Adaptive time estimation

Task generation remains in Groq (and its existing fallback). The adaptive service preserves baseEstimatedMinutes, retains estimatedMinutes as a compatibility base, and computes adaptiveEstimatedMinutes. All capacity/display consumers use an effective-duration helper. Legacy tasks without new fields use estimatedMinutes; no destructive migration is required.

Learning begins after three valid completed focus tasks. Ratios use actual/base, accepting 0.4 through 2.5. EMA alpha is 0.25, starting at 1; its internal warm-up value accumulates while the public multiplier remains 1 for the first two samples. Multipliers clamp to 0.7 through 1.75. Personalized durations round to the nearest five minutes; inactive/disabled estimates keep the exact base. Constants live in adaptiveEstimationService.js.

Focus uses authenticated start, pause, heartbeat and complete task endpoints. Active server intervals accumulate across pauses and timer closes; the browser displays a monotonic timer and can continue beyond the target. Heartbeats every 15 seconds renew a 45-second active lease. Lost connections or abandoned tabs cannot count indefinitely; severe browser throttling may undercount focus. Manual completion without recorded focus contributes zero actual minutes and no learning sample. Client-supplied actual minutes are ignored. Existing clients should refresh to load the updated timer.

An atomic completion transition prevents repeat/concurrent completion from counting a task twice. Valid samples update aggregate user statistics with an atomic MongoDB pipeline. Accuracy is the mean of max(0, 100 - abs(actual - planned) / planned * 100) for valid samples; pace ratios always compare against the original base. Analytics shows aggregate original and actual totals for those same samples.

Pace updates never reshuffle existing schedules. New plans, explicit Rescue and Quick Adjust personalize pending work using the current profile. Completed task estimates and timing remain unchanged. Rescue returns remaining workload and feasibility; per-task rounding means four 45-minute tasks at 1.3 total 240 minutes (four 60-minute slots). Quick Adjust rejects moving work beyond the deadline. Existing scheduler overload behavior remains visible through feasibility rather than silently changing calendar boundaries.

Settings > Study Preferences > Adaptive Time Estimation defaults on. Turning it off uses base estimates for future planning/rebalancing, preserves history, and continues recording actual focus data. Resetting learned pace is intentionally not exposed.

Verification:
- Backend: npm test (31 tests, including 9 adaptive cases; disposable MongoDB, deterministic Groq fixture).
- Frontend: npm test (serial render and clock tests), npm run build.
- Focused lint: npx oxlint src/components/tasks/FocusTimer.jsx src/components/AdaptivePaceCard.jsx src/utils/taskEstimates.js src/utils/focusClock.js

Browser visual verification was unavailable because the browser runtime failed to initialize under the Windows sandbox. UI render checks cover learning, active and disabled analytics states, personalized/completed task cards and timer overtime. The production build retains the existing large-chunk warning.

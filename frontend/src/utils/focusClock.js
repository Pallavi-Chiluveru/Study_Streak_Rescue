// Monotonic active time: pausing snapshots duration; resuming starts a new interval.
export const elapsedFocusMs = (clock, now) => clock.accumulated + (clock.since === null ? 0 : Math.max(0, now - clock.since));
export const pauseFocusClock = (clock, now) => ({ accumulated: elapsedFocusMs(clock, now), since: null });
export const resumeFocusClock = (clock, now) => ({ ...clock, since: clock.since ?? now });

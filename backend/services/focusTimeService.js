// Active intervals only. Heartbeats bound abandoned browser sessions to a 45s lease.
// No heartbeat field means a legacy session; retain compatibility until its next checkpoint.
const FOCUS_LEASE_MS = 45000;
const focusMilliseconds = (task, now = Date.now()) => {
  const end = task.focusHeartbeatAt ? Math.min(now, new Date(task.focusHeartbeatAt).getTime() + FOCUS_LEASE_MS) : now;
  return Math.max(0, task.focusAccumulatedMs || 0)
    + (task.focusRunningSince ? Math.max(0, end - new Date(task.focusRunningSince).getTime()) : 0);
};
module.exports = { focusMilliseconds, FOCUS_LEASE_MS };

const User = require('../models/User');
const Plan = require('../models/Plan');
const Task = require('../models/Task');
const Goal = require('../models/Goal');
const { getEffectiveEstimatedMinutes } = require('./adaptiveEstimationService');
const { calculatePlanHealth } = require('./healthService');
const { createNotification } = require('./notificationService');

const dateKey = (date = new Date(), timeZone = 'UTC') => {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(date));
    const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
    return values.year + '-' + values.month + '-' + values.day;
  } catch {
    return new Date(date).toISOString().slice(0, 10);
  }
};
const daysBetweenKeys = (from, to) => Math.round((Date.parse(to + 'T12:00:00Z') - Date.parse(from + 'T12:00:00Z')) / 86400000);
const addDaysKey = (key, amount) => new Date(Date.parse(key + 'T12:00:00Z') + amount * 86400000).toISOString().slice(0, 10);
const formatDuration = value => {
  const minutes = Math.max(0, Math.round(Number(value) || 0));
  const hours = Math.floor(minutes / 60);
  return hours ? hours + 'h' + (minutes % 60 ? ' ' + (minutes % 60) + 'm' : '') : minutes + 'm';
};
const weekKey = key => {
  const date = new Date(key + 'T12:00:00Z');
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() - day + 1);
  return date.toISOString().slice(0, 10);
};
const clientUrl = path => new URL(path, process.env.CLIENT_URL).href;

const evaluateUserNotifications = async userOrId => {
  const user = userOrId?._id ? userOrId : await User.findById(userOrId);
  if (!user) return;
  const timeZone = user.timezone || 'UTC';
  const today = dateKey(new Date(), timeZone);
  const plans = await Plan.find({ userId: user._id, status: { $in: ['active', 'at_risk', 'rescue_needed'] } });
  const tasks = await Task.find({ userId: user._id, status: { $ne: 'completed' } });
  const newlyMissed = tasks.filter(task => task.status === 'pending' && dateKey(task.scheduledDate, timeZone) < today);
  if (newlyMissed.length) {
    await Task.updateMany({ _id: { $in: newlyMissed.map(task => task._id) } }, { $set: { status: 'missed' } });
    newlyMissed.forEach(task => { task.status = 'missed'; });
  }

  const todayTasks = tasks.filter(task => dateKey(task.scheduledDate, timeZone) === today && task.status !== 'missed');
  const todayMinutes = todayTasks.reduce((sum, task) => sum + getEffectiveEstimatedMinutes(task), 0);
  if (todayTasks.length) await createNotification({
    user, eventType: 'TODAY_SCHEDULE', severity: 'low', dedupeKey: 'TODAY_SCHEDULE:' + today,
    title: "Today's study schedule is ready",
    message: 'You have ' + todayTasks.length + ' task' + (todayTasks.length === 1 ? '' : 's') + ' · ' + formatDuration(todayMinutes) + ' planned today.',
    actionLabel: 'Open Today', actionUrl: '/today', expiresAt: new Date(Date.now() + 172800000),
    email: { subject: "Today's Study Streak plan", title: "Today's study schedule", message: 'Your focused study plan is ready.',
      metrics: [{ label: 'Tasks', value: String(todayTasks.length) }, { label: 'Planned time', value: formatDuration(todayMinutes) }],
      actionLabel: 'Open Dashboard', actionUrl: clientUrl('/dashboard') }
  });

  for (const task of todayTasks.slice(0, 5)) await createNotification({
    user, eventType: 'TASK_DUE_TODAY', severity: 'low', dedupeKey: 'TASK_DUE_TODAY:' + task._id + ':' + today,
    title: task.title + ' is due today', message: 'About ' + formatDuration(getEffectiveEstimatedMinutes(task)) + ' of work remains.',
    actionLabel: 'Start Focus', actionUrl: '/today?task=' + task._id, relatedTaskId: task._id, relatedPlanId: task.planId,
    expiresAt: new Date(Date.now() + 172800000),
    email: { subject: task.title + ' is due today', title: task.title + ' is due today',
      message: 'Your ordinary task reminder email preference is enabled.',
      metrics: [{ label: 'Estimated work', value: formatDuration(getEffectiveEstimatedMinutes(task)) }],
      actionLabel: 'Start Focus', actionUrl: clientUrl('/today?task=' + task._id) }
  });

  const timeParts = new Intl.DateTimeFormat('en-US', { timeZone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date());
  const timeValues = Object.fromEntries(timeParts.map(part => [part.type, part.value]));
  const currentMinute = Number(timeValues.hour) * 60 + Number(timeValues.minute);
  for (const task of todayTasks.filter(item => Number.isFinite(item.scheduledStartMinute))) {
    const minutesUntil = task.scheduledStartMinute - currentMinute;
    if (minutesUntil < 0 || minutesUntil > 120) continue;
    await createNotification({
      user, eventType: 'TASK_DUE_SOON', severity: 'medium',
      dedupeKey: 'TASK_DUE_SOON:' + task._id + ':' + today,
      title: task.title + ' is due soon',
      message: 'Scheduled in about ' + formatDuration(minutesUntil) + ' · ' + formatDuration(getEffectiveEstimatedMinutes(task)) + ' of work.',
      actionLabel: 'Start Focus', actionUrl: '/today?task=' + task._id,
      relatedTaskId: task._id, relatedPlanId: task.planId,
      expiresAt: new Date(Date.now() + 4 * 3600000),
      email: { subject: task.title + ' is due soon', title: task.title + ' is due soon',
        message: 'Your ordinary task reminder email preference is enabled.',
        metrics: [{ label: 'Starts in', value: formatDuration(minutesUntil) }],
        actionLabel: 'Start Focus', actionUrl: clientUrl('/today?task=' + task._id) }
    });
  }

  const dailyCapacity = Number(user.preferences?.defaultDailyMinutes) || 120;
  const earlyTask = tasks.find(task => dateKey(task.scheduledDate, timeZone) === addDaysKey(today, 1) && ['pending', 'rescheduled'].includes(task.status));
  if (earlyTask && todayMinutes + getEffectiveEstimatedMinutes(earlyTask) <= dailyCapacity) await createNotification({
    user, eventType: 'START_EARLY_OPPORTUNITY', severity: 'low',
    dedupeKey: 'START_EARLY:' + earlyTask._id + ':' + today,
    title: 'You have spare capacity today',
    message: 'Want to start tomorrow\'s ' + earlyTask.title + ' task early?',
    actionLabel: 'Start Early', actionUrl: '/today?task=' + earlyTask._id, actionMethod: 'start_early',
    relatedTaskId: earlyTask._id, relatedPlanId: earlyTask.planId, expiresAt: new Date(Date.now() + 86400000)
  });
  const goals = await Goal.find({ userId: user._id, status: 'active' });
  const goalsById = new Map(goals.map(goal => [String(goal._id), goal]));
  for (const plan of plans) {
    const planTasks = tasks.filter(task => String(task.planId) === String(plan._id));
    const missed = planTasks.filter(task => task.status === 'missed');
    const remaining = planTasks.reduce((sum, task) => sum + getEffectiveEstimatedMinutes(task), 0);
    const health = calculatePlanHealth(plan, planTasks).healthScore;
    const deadlineKey = dateKey(plan.deadline, timeZone);
    const daysLeft = daysBetweenKeys(today, deadlineKey);
    const available = Math.max(0, daysLeft + 1) * (plan.availableMinutesPerDay || user.preferences?.defaultDailyMinutes || 0);
    const isCritical = health < 40 || (remaining > available && remaining > 0);
    const enteredCritical = isCritical && !plan.notificationState?.critical;
    if (plan.healthScore !== health || Boolean(plan.notificationState?.critical) !== isCritical) {
      plan.healthScore = health;
      if (plan.healthHistory.at(-1)?.score !== health) plan.healthHistory.push({ score: health });
      plan.status = health < 40 ? 'rescue_needed' : health < 60 ? 'at_risk' : 'active';
      plan.notificationState = { ...(plan.notificationState?.toObject?.() || plan.notificationState || {}), critical: isCritical };
      await plan.save();
    }
    const planPath = '/plans/' + plan._id;
    const emailBase = { actionLabel: 'Rescue My Plan', actionUrl: clientUrl(planPath) };

    if (missed.length === 1) {
      const task = missed[0];
      await createNotification({ user, eventType: 'TASK_MISSED', severity: 'medium', dedupeKey: 'TASK_MISSED:' + task._id,
        title: task.title + ' was missed', message: 'Reschedule it before it adds pressure to the rest of your week.',
        actionLabel: 'Rescue to Reschedule', actionUrl: planPath, relatedTaskId: task._id, relatedPlanId: plan._id });
    }
    if (missed.length >= 2) await createNotification({
      user, eventType: 'MULTIPLE_TASKS_MISSED', severity: 'high',
      dedupeKey: 'MULTIPLE_TASKS_MISSED:' + plan._id + ':' + weekKey(today) + ':' + (missed.length >= 4 ? '4PLUS' : '2TO3'),
      title: missed.length + ' tasks need your attention',
      message: missed.length + ' tasks are overdue and Plan Health is ' + health + '%. Rescue your schedule before the workload grows.',
      actionLabel: 'Rescue My Plan', actionUrl: planPath, relatedPlanId: plan._id,
      email: { subject: 'A few study tasks need your attention', title: 'Your plan needs attention',
        message: missed.length + ' tasks from ' + plan.title + ' are now overdue. We can help rebuild the remaining schedule.',
        metrics: [{ label: 'Overdue tasks', value: String(missed.length) }, { label: 'Remaining work', value: formatDuration(remaining) }], ...emailBase }
    });

    if ((health >= 40 && health < 80) || (health < 40 && missed.length === 1)) await createNotification({
      user, eventType: 'PLAN_HEALTH_WARNING', severity: 'medium',
      dedupeKey: 'PLAN_HEALTH_WARNING:' + plan._id + ':' + (health >= 60 ? '60' : '40'),
      title: health >= 60 ? 'Your plan needs attention' : 'Your plan is at risk',
      message: 'Plan Health is ' + health + '% with ' + missed.length + ' missed task' + (missed.length === 1 ? '' : 's') + '.',
      actionLabel: 'Rescue My Plan', actionUrl: planPath, relatedPlanId: plan._id
    });
    if (health < 40 && missed.length !== 1) await createNotification({
      user, eventType: 'PLAN_HEALTH_CRITICAL', severity: 'critical', dedupeKey: 'PLAN_HEALTH_CRITICAL:' + plan._id + ':' + today,
      title: 'Your plan is at risk', message: 'Plan Health is ' + health + '% and ' + formatDuration(remaining) + ' of work remains.',
      actionLabel: 'Rescue My Plan', actionUrl: planPath, relatedPlanId: plan._id, impactEligible: enteredCritical && health < 40,
      email: { subject: 'Your Study Streak plan needs attention', title: 'Your current plan is at risk',
        message: 'Your plan health has dropped to ' + health + '%. Your remaining workload may no longer fit before the deadline.',
        metrics: [{ label: 'Overdue tasks', value: String(missed.length) }, { label: 'Remaining work', value: formatDuration(remaining) }], ...emailBase }
    });

    const goal = plan.goalId ? goalsById.get(String(plan.goalId)) : null;
    const important = plan.priority === 'high' || ['essential', 'important'].includes(goal?.importance);
    if (important && [1, 3].includes(daysLeft)) await createNotification({
      user, eventType: daysLeft === 1 ? 'GOAL_DEADLINE_TOMORROW' : 'GOAL_DEADLINE_SOON', severity: 'high',
      dedupeKey: 'DEADLINE:' + plan._id + ':' + deadlineKey + ':' + daysLeft,
      title: plan.title + (daysLeft === 1 ? ' is due tomorrow' : ' is due in 3 days'),
      message: 'About ' + formatDuration(remaining) + ' of planned work remains.',
      actionLabel: 'View Plan', actionUrl: planPath, relatedPlanId: plan._id, relatedGoalId: plan.goalId,
      email: { subject: 'Your ' + plan.title + ' deadline is approaching', title: daysLeft === 1 ? 'Your deadline is tomorrow' : 'Your deadline is in 3 days',
        message: 'Staying on schedule now matters, and Study Streak Rescue can help if your availability changes.',
        metrics: [{ label: 'Remaining work', value: formatDuration(remaining) }], actionLabel: 'View My Plan', actionUrl: clientUrl(planPath) }
    });

    if (remaining > available && remaining > 0) await createNotification({
      user, eventType: 'PLAN_INFEASIBLE', severity: 'critical', dedupeKey: 'PLAN_INFEASIBLE:' + plan._id + ':' + today,
      title: 'Your current schedule cannot meet the deadline',
      message: 'You need about ' + formatDuration(remaining) + ' but currently have ' + formatDuration(available) + ' available.',
      actionLabel: 'Rescue My Plan', actionUrl: planPath, relatedPlanId: plan._id, impactEligible: enteredCritical && health >= 40,
      email: { subject: 'Your current study schedule may need a rescue', title: 'Your workload is higher than your available time',
        message: 'Study Streak Rescue can help redistribute your remaining work or adjust the plan.',
        metrics: [{ label: 'Remaining work', value: formatDuration(remaining) }, { label: 'Available time', value: formatDuration(available) }], ...emailBase }
    });
  }
  const plannedGoalIds = new Set(plans.filter(plan => plan.goalId).map(plan => String(plan.goalId)));
  for (const goal of goals) {
    if (!goal.deadline || plannedGoalIds.has(String(goal._id)) || !['essential', 'important'].includes(goal.importance)) continue;
    const deadlineKey = dateKey(goal.deadline, timeZone);
    const daysLeft = daysBetweenKeys(today, deadlineKey);
    if (![1, 3].includes(daysLeft)) continue;
    const remaining = Math.max(0, Number(goal.totalEstimatedMinutes) || 0);
    const goalPath = '/goals';
    await createNotification({
      user, eventType: daysLeft === 1 ? 'GOAL_DEADLINE_TOMORROW' : 'GOAL_DEADLINE_SOON', severity: 'high',
      dedupeKey: 'GOAL_DEADLINE:' + goal._id + ':' + deadlineKey + ':' + daysLeft,
      title: goal.title + (daysLeft === 1 ? ' is due tomorrow' : ' is due in 3 days'),
      message: remaining ? 'About ' + formatDuration(remaining) + ' of planned work remains.' : 'Review your remaining work while there is still time to adjust.',
      actionLabel: 'View Goal', actionUrl: goalPath, relatedGoalId: goal._id,
      email: { subject: 'Your ' + goal.title + ' deadline is approaching',
        title: daysLeft === 1 ? 'Your goal deadline is tomorrow' : 'Your goal deadline is in 3 days',
        message: 'Staying on schedule now matters, and Study Streak Rescue can help if your availability changes.',
        metrics: remaining ? [{ label: 'Remaining work', value: formatDuration(remaining) }] : [],
        actionLabel: 'View Goal', actionUrl: clientUrl(goalPath) }
    });
  }
  const weekday = new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'short' }).format(new Date());
  if (weekday === 'Mon') {
    const since = new Date(Date.now() - 7 * 86400000);
    const completed = await Task.find({ userId: user._id, status: 'completed', completedAt: { $gte: since } });
    const focusMinutes = completed.reduce((sum, task) => sum + (Number(task.actualFocusMinutes) || 0), 0);
    const onTrack = plans.filter(plan => (plan.healthScore ?? 100) >= 60).length;
    const averageHealth = plans.length ? Math.round(plans.reduce((sum, plan) => sum + (plan.healthScore ?? 100), 0) / plans.length) : 100;
    await createNotification({
      user, eventType: 'WEEKLY_SUMMARY', severity: 'low', dedupeKey: 'WEEKLY_SUMMARY:' + weekKey(today),
      title: 'Your Study Streak week in review',
      message: completed.length + ' tasks completed · ' + formatDuration(focusMinutes) + ' focused · ' + onTrack + '/' + plans.length + ' plans on track.',
      actionLabel: 'View Analytics', actionUrl: '/analytics',
      email: { subject: 'Your Study Streak week in review', title: 'Your weekly progress summary', message: 'Here is the progress you made this week.',
        metrics: [{ label: 'Tasks completed', value: String(completed.length) }, { label: 'Focus time', value: formatDuration(focusMinutes) },
          { label: 'Current streak', value: (user.streak || 0) + ' days' }, { label: 'Goals on track', value: onTrack + ' / ' + plans.length },
          { label: 'Plan health', value: averageHealth + '%' }],
        actionLabel: 'View Dashboard', actionUrl: clientUrl('/dashboard') }
    });
  }
};
const evaluateAllUsers = async () => {
  const users = await User.find({});
  for (const user of users) {
    try { await evaluateUserNotifications(user); } catch { console.error('Notification evaluation failed for one user.'); }
  }
};
module.exports = { dateKey, daysBetweenKeys, formatDuration, weekKey, evaluateUserNotifications, evaluateAllUsers };

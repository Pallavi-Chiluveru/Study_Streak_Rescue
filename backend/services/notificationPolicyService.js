const IN_APP_CATEGORY = {
  TODAY_SCHEDULE: 'taskReminders',
  TASK_DUE_TODAY: 'taskReminders',
  TASK_DUE_SOON: 'taskReminders',
  START_EARLY_OPPORTUNITY: 'taskReminders',
  TASK_MISSED: 'rescueSuggestions',
  MULTIPLE_TASKS_MISSED: 'rescueSuggestions',
  PLAN_HEALTH_WARNING: 'planHealthAlerts',
  PLAN_HEALTH_CRITICAL: 'planHealthAlerts',
  GOAL_DEADLINE_SOON: 'deadlineAlerts',
  GOAL_DEADLINE_TOMORROW: 'deadlineAlerts',
  PLAN_INFEASIBLE: 'planHealthAlerts',
  RESCUE_SUCCESS: 'rescueSuggestions',
  WEEKLY_SUMMARY: 'taskReminders',
  ACHIEVEMENT_UNLOCKED: 'achievements',
  STREAK_UPDATED: 'streaks',
  SECURITY_ALERT: 'security'
};

const EMAIL_CATEGORY = {
  TASK_DUE_TODAY: 'ordinaryTaskReminders',
  TASK_DUE_SOON: 'ordinaryTaskReminders',
  MULTIPLE_TASKS_MISSED: 'missedWorkAlerts',
  PLAN_HEALTH_CRITICAL: 'planAtRisk',
  GOAL_DEADLINE_SOON: 'importantDeadlines',
  GOAL_DEADLINE_TOMORROW: 'importantDeadlines',
  PLAN_INFEASIBLE: 'planAtRisk',
  WEEKLY_SUMMARY: 'weeklySummary'
};

const decideDeliveryChannels = ({ eventType, severity, userPreferences = {} }) => {
  if (eventType === 'SECURITY_ALERT') return { inApp: true, email: true };
  const inAppPreferences = userPreferences.inApp || {};
  const emailPreferences = userPreferences.email || {};
  const inAppCategory = IN_APP_CATEGORY[eventType];
  const emailCategory = EMAIL_CATEGORY[eventType];
  const inApp = inAppCategory ? inAppPreferences[inAppCategory] !== false : true;
  const severityAllowsEmail = severity === 'high' || severity === 'critical';
  const email = Boolean(
    severityAllowsEmail &&
    emailCategory &&
    emailPreferences.enabled !== false &&
    emailPreferences[emailCategory] !== false
  );
  return { inApp, email };
};

module.exports = { IN_APP_CATEGORY, EMAIL_CATEGORY, decideDeliveryChannels };
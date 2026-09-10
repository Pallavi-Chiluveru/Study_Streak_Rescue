const { getAvailableDays, getStartOfDay } = require('../utils/dateUtils');

/**
 * Calculates Plan Health Score (0 - 100)
 * Factors:
 * 1. Completion Percentage (weight: 40%)
 * 2. Missed Task Ratio (weight: -35% penalty)
 * 3. Schedule Feasibility / Pace (weight: 25%)
 */
const calculatePlanHealth = (plan, tasks = []) => {
  if (!tasks || tasks.length === 0) {
    return { healthScore: 100, healthStatus: 'Excellent', label: '90-100 Excellent' };
  }

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const missedTasks = tasks.filter(t => t.status === 'missed').length;
  const pendingTasks = tasks.filter(t => t.status === 'pending' || t.status === 'active' || t.status === 'rescheduled').length;

  const completionPct = (completedTasks / totalTasks) * 100;
  const missedRatio = (missedTasks / totalTasks);

  // Time progress check
  const now = getStartOfDay(new Date());
  const startDate = getStartOfDay(plan.startDate || new Date());
  const deadline = getStartOfDay(plan.deadline);

  const totalPlanDays = getAvailableDays(startDate, deadline);
  const daysPassed = getAvailableDays(startDate, now) - 1;
  const daysRemaining = getAvailableDays(now, deadline);

  // Ideal progress: proportion of days passed vs total duration
  const timePassedPct = Math.min(100, Math.max(0, (daysPassed / Math.max(1, totalPlanDays)) * 100));

  // Pace factor: compare actual completion % vs time passed %
  let paceScore = 100;
  if (timePassedPct > 0) {
    const paceRatio = completionPct / Math.max(1, timePassedPct);
    paceScore = Math.min(100, Math.max(20, paceRatio * 100));
  }

  // Base score calculation
  let healthScore = (completionPct * 0.45) + (paceScore * 0.35) - (missedRatio * 80);

  // Penalty for missed tasks specifically
  if (missedTasks > 0) {
    healthScore -= (missedTasks * 10);
  }

  // Bounds check (0 to 100)
  healthScore = Math.round(Math.min(100, Math.max(0, healthScore)));

  // Special override: If missed tasks exist and completion is low, force rescue recommended range
  if (missedTasks >= 3 && healthScore > 49) {
    healthScore = Math.min(healthScore, 48);
  }

  let healthStatus = 'Excellent';
  if (healthScore >= 90) {
    healthStatus = 'Excellent';
  } else if (healthScore >= 70) {
    healthStatus = 'On Track';
  } else if (healthScore >= 50) {
    healthStatus = 'At Risk';
  } else {
    healthStatus = 'Rescue Recommended';
  }

  return {
    healthScore,
    healthStatus,
    completedTasks,
    missedTasks,
    pendingTasks,
    totalTasks,
    daysRemaining
  };
};

module.exports = {
  calculatePlanHealth
};

const { getAvailableDays } = require('../utils/dateUtils');

/**
 * Mathematical Feasibility Engine
 * Compares total estimated work against user's total available time window.
 */
const checkFeasibility = (startDate, deadline, availableMinutesPerDay, estimatedTotalMinutes) => {
  const availableDays = getAvailableDays(startDate, deadline);
  const totalAvailableMinutes = availableDays * availableMinutesPerDay;

  const estimatedHours = (estimatedTotalMinutes / 60).toFixed(1);
  const availableHours = (totalAvailableMinutes / 60).toFixed(1);

  const isFeasible = totalAvailableMinutes >= estimatedTotalMinutes;
  const deficitMinutes = Math.max(0, estimatedTotalMinutes - totalAvailableMinutes);
  const deficitHours = (deficitMinutes / 60).toFixed(1);

  return {
    isFeasible,
    availableDays,
    totalAvailableMinutes,
    estimatedTotalMinutes,
    estimatedHours: parseFloat(estimatedHours),
    availableHours: parseFloat(availableHours),
    deficitHours: parseFloat(deficitHours),
    statusMessage: isFeasible
      ? `✅ YOUR PLAN IS ACHIEVABLE (${estimatedHours}h work in ${availableHours}h available)`
      : `⚠ PLAN NEEDS ADJUSTMENT (Short by ~${deficitHours} hours)`,
    suggestedOptions: isFeasible ? [] : [
      'Extend Deadline',
      'Increase Daily Time',
      'Reduce Scope',
      'Create Priority Plan'
    ]
  };
};

module.exports = {
  checkFeasibility
};

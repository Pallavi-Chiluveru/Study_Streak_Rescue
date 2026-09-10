const { getDateRange, getStartOfDay } = require('../utils/dateUtils');

/**
 * Distributes micro-tasks across the dates between startDate and deadline.
 */
const scheduleTasks = (tasks, startDate, deadline, availableMinutesPerDay) => {
  const dates = getDateRange(startDate, deadline);
  if (dates.length === 0) return tasks;

  let currentDayIndex = 0;
  let currentDayAllocatedMinutes = 0;

  return tasks.map(task => {
    const taskMinutes = task.estimatedMinutes || 45;

    // If adding task exceeds daily limit and we still have future dates, move to next day
    if (
      currentDayAllocatedMinutes + taskMinutes > availableMinutesPerDay &&
      currentDayIndex < dates.length - 1 &&
      currentDayAllocatedMinutes > 0
    ) {
      currentDayIndex++;
      currentDayAllocatedMinutes = 0;
    }

    const scheduledDate = dates[currentDayIndex] || dates[dates.length - 1];
    currentDayAllocatedMinutes += taskMinutes;

    return {
      ...task,
      scheduledDate: getStartOfDay(scheduledDate),
      status: task.status || 'pending'
    };
  });
};

module.exports = {
  scheduleTasks
};

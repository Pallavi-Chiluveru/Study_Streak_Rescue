/**
 * Date helper utilities for scheduling and rescue logic.
 */

// Normalize date to start of day in UTC/local string (YYYY-MM-DD)
const getStartOfDay = (date = new Date()) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

// Normalize date to end of day
const getEndOfDay = (date = new Date()) => {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
};

// Calculate difference in whole days between start and end date (inclusive)
const getAvailableDays = (startDate, deadlineDate) => {
  const start = getStartOfDay(startDate);
  const end = getStartOfDay(deadlineDate);
  const diffTime = end.getTime() - start.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(1, diffDays + 1); // Inclusive of deadline day
};

// Get array of Date objects representing each day in interval
const getDateRange = (startDate, deadlineDate) => {
  const dates = [];
  const curr = getStartOfDay(startDate);
  const end = getStartOfDay(deadlineDate);

  while (curr <= end) {
    dates.push(new Date(curr));
    curr.setDate(curr.getDate() + 1);
  }

  // If no dates generated (e.g. deadline is today), include today
  if (dates.length === 0) {
    dates.push(getStartOfDay(startDate));
  }

  return dates;
};

// Format date as YYYY-MM-DD string
const formatDateString = (date) => {
  const d = new Date(date);
  return d.toISOString().split('T')[0];
};

module.exports = {
  getStartOfDay,
  getEndOfDay,
  getAvailableDays,
  getDateRange,
  formatDateString
};

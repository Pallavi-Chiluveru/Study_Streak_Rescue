const { getEffectiveEstimatedMinutes } = require('./adaptiveEstimationService');
const { getDateRange, assertDateWithinRange } = require('../utils/dateUtils');

/**
 * Distributes micro-tasks across the dates between startDate and deadline.
 */
const scheduleTasks = (tasks, startDate, deadline, availableMinutesPerDay) => {
  const dates = getDateRange(startDate, deadline);
  if (dates.length === 0) return tasks;

  let currentDayIndex = 0;
  let currentDayAllocatedMinutes = 0;

  return tasks.map(task => {
    const taskMinutes = getEffectiveEstimatedMinutes(task);

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

    const normalizedScheduledDate = assertDateWithinRange(scheduledDate, startDate, deadline);

    return {
      ...task,
      scheduledDate: normalizedScheduledDate,
      status: task.status || 'pending'
    };
  });
};

module.exports = {
  scheduleTasks
};

// The master mode shares this scheduling module and Task calendar with Quick Plan.
// It never overbooks a day: unplaced work is returned explicitly for review.
const { capacityDays, subtract, takeSlot } = require('./availabilityService');
const { formatDateString } = require('../utils/dateUtils');
const { priorityScore } = require('./goalPriorityService');
const scheduleMasterTasks = ({ jobs, protectedTasks = [], profile, start, end, todayMinutes }) => {
 const days = capacityDays(profile,start,end,todayMinutes), conflicts = [], unscheduled = [];
 for (const task of protectedTasks) {
  if (task.scheduleState === 'held') continue;
  const day = days.find(d => d.key === formatDateString(task.scheduledDate)); if (!day) continue;
  const minutes = getEffectiveEstimatedMinutes(task);
  if (Number.isFinite(task.scheduledStartMinute) && Number.isFinite(task.scheduledEndMinute)) {
   const a=task.scheduledStartMinute,b=task.scheduledEndMinute;
   if (!day.spans.some(([x,y]) => a>=x && b<=y)) conflicts.push('An existing session overlaps unavailable time. Review existing plans.');
   day.spans = subtract(day.spans,a,b); day.used += minutes;
  } else if (!takeSlot(day,minutes,profile.preferredStudyPeriod)) { day.used += minutes; conflicts.push('Existing plan work exceeds available capacity. Rebalance or adjust availability.'); }
  if (day.used > day.capacity) conflicts.push('Existing tasks already exceed the buffered daily capacity.');
  day.sessions.push({ ...task, protected: true });
 }
 const pending = [...jobs], placed = [], allocated = new Map(), goalDates = new Map();
 while (pending.length) {
  pending.sort((a,b) => {
   const ap=allocated.get(String(a.goal._id)) || 0,bp=allocated.get(String(b.goal._id)) || 0;
   const aMin=ap < (a.goal.minimumWeeklyMinutes || 0), bMin=bp < (b.goal.minimumWeeklyMinutes || 0);
   return Number(bMin)-Number(aMin) || a.allowedDates.length-b.allowedDates.length || ap/Math.max(1,a.targetMinutes)-bp/Math.max(1,b.targetMinutes) || priorityScore(b.goal)-priorityScore(a.goal);
  });
  const job=pending.shift(), key=String(job.goal._id), usedDates=goalDates.get(key) || new Set();
  const possible=days.filter(d => job.allowedDates.includes(d.key) && (!job.distinctDay || !usedDates.has(d.key)))
   .sort((a,b) => a.used/Math.max(1,a.capacity)-b.used/Math.max(1,b.capacity) || a.key.localeCompare(b.key));
  let selected;
  for (const day of possible) { const slot=takeSlot(day,getEffectiveEstimatedMinutes(job.task),profile.preferredStudyPeriod); if (slot) { selected={ day,slot }; break; } }
  if (!selected) { unscheduled.push({ goalId:key, title:job.task.title, minutes:getEffectiveEstimatedMinutes(job.task), reason:'No legal day or free capacity matches this goal cadence and dates.' }); continue; }
  const task={ ...job.task,...selected.slot,goalId:key,goalTitle:job.goal.title };
  selected.day.sessions.push(task); placed.push(task); usedDates.add(selected.day.key); goalDates.set(key,usedDates);
  allocated.set(key,(allocated.get(key)||0)+getEffectiveEstimatedMinutes(task));
 }
 const available=days.reduce((s,d)=>s+d.available,0), capacity=days.reduce((s,d)=>s+d.capacity,0), planned=days.reduce((s,d)=>s+d.used,0);
 return { tasks:placed, days:days.map(({spans,...day})=>day), unscheduled, conflicts:[...new Set(conflicts)],
  availableMinutes:available, capacityMinutes:capacity, plannedMinutes:planned, bufferMinutes:Math.max(0,available-planned),
  requiredMinutes:planned+unscheduled.reduce((s,t)=>s+t.minutes,0), shortageMinutes:Math.max(0,planned+unscheduled.reduce((s,t)=>s+t.minutes,0)-capacity),
  feasible:!unscheduled.length && !conflicts.length, reality:unscheduled.length || conflicts.length ? 'Not Feasible' : planned/Math.max(1,available)>0.85 ? 'Tight' : planned/Math.max(1,available)>0.6 ? 'Realistic' : 'Comfortable' };
};
module.exports.scheduleMasterTasks = scheduleMasterTasks;

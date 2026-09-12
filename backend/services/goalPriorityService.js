const { getAvailableDays, getStartOfDay } = require('../utils/dateUtils');
const priorityScore = (goal, completed = 0, planned = 0) => {
 const days = goal.deadline ? getAvailableDays(new Date(),goal.deadline) : 365;
 const urgency = goal.deadline ? Math.min(35,70/days) : 0;
 const milestoneDebt = (goal.milestones || []).filter(m => m.status !== 'completed' && m.targetDate && getStartOfDay(m.targetDate) <= getStartOfDay(new Date())).length*5;
 return ({ high: 20, medium: 12, low: 5 }[goal.priority] || 12) + ({ essential: 15, important: 8, flexible: 2 }[goal.importance] || 8)
  + urgency + milestoneDebt + Math.max(0,(goal.cadence?.timesPerWeek || 3)-completed-planned)*4;
};
const goalHealth = (goal, tasks) => {
 const completed = tasks.filter(t => t.status === 'completed').length;
 const missed = tasks.filter(t => t.status !== 'completed' && t.scheduleState !== 'held' && getStartOfDay(t.scheduledDate) < getStartOfDay(new Date())).length;
 const milestones = goal.milestones || [];
 const progress = milestones.length ? Math.round(milestones.filter(m => m.status === 'completed').length/milestones.length*100) : null;
 const overdueMilestones = milestones.some(m => m.status !== 'completed' && m.targetDate && getStartOfDay(m.targetDate) < getStartOfDay(new Date()));
 const deadlineRisk = goal.deadline && getAvailableDays(new Date(),goal.deadline) <= 7 && (progress ?? goal.currentProgress ?? 0) < 80;
 return { roadmapProgress: progress, taskProgress: tasks.length ? Math.round(completed/tasks.length*100) : 0,
  completedTasks: completed, totalTasks: tasks.length, health: missed || deadlineRisk ? 'At Risk' : overdueMilestones ? 'Needs Attention' : 'Healthy' };
};
module.exports = { priorityScore, goalHealth };

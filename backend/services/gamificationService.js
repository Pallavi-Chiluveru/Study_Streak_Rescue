const User = require('../models/User');
const Task = require('../models/Task');
const Plan = require('../models/Plan');
const { formatDateString, getStartOfDay } = require('../utils/dateUtils');

const LEVELS = [
    { level: 1, name: 'Starter', minXP: 0, maxXP: 500 },
    { level: 2, name: 'Spark', minXP: 500, maxXP: 1000 },
    { level: 3, name: 'Momentum', minXP: 1000, maxXP: 2500 },
    { level: 4, name: 'Focused', minXP: 2500, maxXP: 5000 },
    { level: 5, name: 'Achiever', minXP: 5000, maxXP: 10000 },
    { level: 6, name: 'Streak Master', minXP: 10000, maxXP: 20000 },
    { level: 7, name: 'Momentum Legend', minXP: 20000, maxXP: Infinity }
];

const ACHIEVEMENTS = [
    ['first_spark', 'First Spark', 'Complete your first task.', 'Progress', 1, 'tasksCompleted', 50],
    ['task_crusher_1', 'Task Crusher I', 'Complete 10 tasks.', 'Progress', 10, 'tasksCompleted', 150],
    ['task_crusher_2', 'Task Crusher II', 'Complete 25 tasks.', 'Progress', 25, 'tasksCompleted', 300],
    ['momentum_master', 'Momentum Master', 'Complete 50 tasks.', 'Progress', 50, 'tasksCompleted', 500],
    ['century_club', 'Century Club', 'Complete 100 tasks.', 'Progress', 100, 'tasksCompleted', 1000],
    ['task_legend', 'Task Legend', 'Complete 250 tasks.', 'Progress', 250, 'tasksCompleted', 2000],
    ['on_fire', 'On Fire', 'Reach a 3-day streak.', 'Streaks', 3, 'longestStreak', 150],
    ['consistent_1', 'Consistent I', 'Reach a 7-day streak.', 'Streaks', 7, 'longestStreak', 300],
    ['consistent_2', 'Consistent II', 'Reach a 14-day streak.', 'Streaks', 14, 'longestStreak', 500],
    ['consistency_pro', 'Consistency Pro', 'Reach a 30-day streak.', 'Streaks', 30, 'longestStreak', 1000],
    ['unstoppable', 'Unstoppable', 'Reach a 60-day streak.', 'Streaks', 60, 'longestStreak', 1800],
    ['discipline_master', 'Discipline Master', 'Reach a 100-day streak.', 'Streaks', 100, 'longestStreak', 3000],
    ['focus_starter', 'Focus Starter', 'Complete your first focus session.', 'Focus', 1, 'focusSessions', 50],
    ['deep_focus_1', 'Deep Focus I', 'Focus for 5 hours.', 'Focus', 300, 'totalFocusMinutes', 200],
    ['deep_focus_2', 'Deep Focus II', 'Focus for 10 hours.', 'Focus', 600, 'totalFocusMinutes', 350],
    ['focus_machine', 'Focus Machine', 'Focus for 20 hours.', 'Focus', 1200, 'totalFocusMinutes', 600],
    ['focus_master', 'Focus Master', 'Focus for 50 hours.', 'Focus', 3000, 'totalFocusMinutes', 1500],
    ['getting_started', 'Getting Started', 'Create your first plan.', 'Plans', 1, 'plansCreated', 50],
    ['goal_getter', 'Goal Getter', 'Complete your first plan.', 'Plans', 1, 'plansCompleted', 250],
    ['finisher', 'Finisher', 'Complete 5 plans.', 'Plans', 5, 'plansCompleted', 750],
    ['goal_machine', 'Goal Machine', 'Complete 10 plans.', 'Plans', 10, 'plansCompleted', 1500],
    ['comeback_rookie', 'Comeback Rookie', 'Rescue your first plan.', 'Rescue', 1, 'rescueCount', 200],
    ['comeback_pro', 'Comeback Pro', 'Rescue 3 plans.', 'Rescue', 3, 'rescueCount', 350],
    ['rescue_expert', 'Rescue Expert', 'Rescue 5 plans.', 'Rescue', 5, 'rescueCount', 500],
    ['recovery_master', 'Recovery Master', 'Rescue 10 plans.', 'Rescue', 10, 'rescueCount', 1000],
    ['never_give_up', 'Never Give Up', 'Complete a plan that was rescued.', 'Rescue', 1, 'rescuedPlansCompleted', 400],
    ['from_red_to_green', 'From Red to Green', 'Recover a plan from below 50% health to above 80%.', 'Rescue', 1, 'recoveredPlans', 300],
    ['early_bird', 'Early Bird', 'Complete a task before its scheduled date.', 'Early Completion', 1, 'earlyTasksCompleted', 100]
].map(([id, title, description, category, target, metric, rewardXP]) => ({ id, title, description, category, target, metric, rewardXP }));

const getLevel = (xp = 0) => LEVELS.find((item) => xp >= item.minXP && xp < item.maxXP) || LEVELS[LEVELS.length - 1];

const getWeekKey = (date = new Date()) => {
    const current = getStartOfDay(date);
    const day = current.getDay() || 7;
    current.setDate(current.getDate() - day + 1);
    return formatDateString(current);
};

const getActivityStats = (tasks, plans, user) => {
    const completedTasks = tasks.filter((task) => task.status === 'completed');
    const focusSessions = completedTasks.filter((task) => (task.actualFocusMinutes || 0) > 0);
    const completedPlans = plans.filter((plan) => plan.status === 'completed');
    const rescuedPlansCompleted = completedPlans.filter((plan) => plan.rescueCount > 0).length;
    const recoveredPlans = plans.filter((plan) => {
        const history = (plan.healthHistory || []).map((entry) => entry.score);
        const lowIndex = history.findIndex((score) => score < 50);
        return lowIndex >= 0 && history.slice(lowIndex + 1).some((score) => score > 80);
    }).length;
    const earlyTasksCompleted = completedTasks.filter((task) => formatDateString(task.completedAt) < formatDateString(task.scheduledDate)).length;
    const rescueCount = plans.reduce((sum, plan) => sum + (plan.rescueCount || 0), 0);
    const now = new Date();
    const todayKey = formatDateString(now);
    const weekKey = getWeekKey(now);
    const tasksToday = completedTasks.filter((task) => formatDateString(task.completedAt) === todayKey);
    const scheduledTasksToday = tasks.filter((task) => formatDateString(task.scheduledDate) === todayKey && task.status !== 'completed');
    const highPriorityTasksToday = tasksToday.filter((task) => task.priority === 'high').length;
    const rescheduledTasksCompleted = tasksToday.filter((task) => task.wasRescheduled).length;
    const tasksThisWeek = completedTasks.filter((task) => getWeekKey(task.completedAt) === weekKey);
    const focusMinutesToday = tasksToday.reduce((sum, task) => sum + (task.actualFocusMinutes || 0), 0);
    const focusMinutesThisWeek = tasksThisWeek.reduce((sum, task) => sum + (task.actualFocusMinutes || 0), 0);
    const activeStudyDaysThisWeek = new Set(tasksThisWeek.map((task) => formatDateString(task.completedAt))).size;

    return {
        tasksCompleted: completedTasks.length,
        plansCreated: plans.length,
        plansCompleted: completedPlans.length,
        totalFocusMinutes: user.totalFocusMinutes || completedTasks.reduce((sum, task) => sum + (task.actualFocusMinutes || 0), 0),
        focusSessions: focusSessions.length,
        currentStreak: user.streak || 0,
        longestStreak: Math.max(user.longestStreak || 0, user.streak || 0),
        rescueCount,
        rescuedPlansCompleted,
        recoveredPlans,
        earlyTasksCompleted,
        tasksCompletedToday: tasksToday.length,
        scheduledTasksToday: scheduledTasksToday.length + tasksToday.length,
        highPriorityTasksToday,
        rescheduledTasksCompleted,
        focusMinutesToday,
        tasksCompletedThisWeek: tasksThisWeek.length,
        focusMinutesThisWeek,
        activeStudyDaysThisWeek
    };
};

const challengeDefinitions = (stats, date = new Date()) => {
    const pool = [
        { id: 'daily_tasks', title: 'Complete tasks', description: 'Complete tasks from your schedule today.', icon: 'CheckCircle2', target: Math.max(1, Math.min(3, stats.scheduledTasksToday || 1)), metric: 'tasksCompletedToday', rewardXP: 50 },
        { id: 'daily_focus', title: 'Focus session', description: 'Spend focused time learning today.', icon: 'Clock', target: stats.focusMinutesToday >= 60 ? 90 : 60, metric: 'focusMinutesToday', rewardXP: 40 },
        { id: 'daily_study_day', title: "Keep today's momentum", description: 'Complete at least one scheduled task today.', icon: 'Zap', target: 1, metric: 'tasksCompletedToday', rewardXP: 75 },
        { id: 'daily_priority', title: 'Finish a priority task', description: 'Complete one high-priority task today.', icon: 'Trophy', target: 1, metric: 'highPriorityTasksToday', rewardXP: 60 },
        { id: 'daily_schedule', title: "Finish today's schedule", description: 'Complete every task scheduled for today.', icon: 'CalendarDays', target: Math.max(1, stats.scheduledTasksToday || 1), metric: 'tasksCompletedToday', rewardXP: 75 },
        { id: 'daily_comeback', title: 'Make a comeback', description: 'Complete a task that was rescheduled.', icon: 'ShieldCheck', target: 1, metric: 'rescheduledTasksCompleted', rewardXP: 80 }
    ];
    const offset = getStartOfDay(date).getDate() % pool.length;
    return [...pool.slice(offset), ...pool.slice(0, offset)].slice(0, 3);
};

const weeklyDefinitions = [
    { id: 'weekly_days', title: 'Study on 5 different days', description: 'Build a consistent weekly rhythm.', icon: 'CalendarDays', target: 5, metric: 'activeStudyDaysThisWeek', rewardXP: 200 },
    { id: 'weekly_tasks', title: 'Complete 15 tasks', description: 'Make meaningful progress across your plans.', icon: 'CheckCircle2', target: 15, metric: 'tasksCompletedThisWeek', rewardXP: 250 },
    { id: 'weekly_focus', title: 'Focus for 6 hours', description: 'Invest 360 focused minutes this week.', icon: 'Clock', target: 360, metric: 'focusMinutesThisWeek', rewardXP: 300 }
];

const evaluateGamification = async (userId) => {
    const [user, tasks, plans] = await Promise.all([
        User.findById(userId),
        Task.find({ userId }),
        Plan.find({ userId })
    ]);
    if (!user) throw new Error('User not found');

    const stats = getActivityStats(tasks, plans, user);
    const unlocked = user.gamification?.achievements || [];
    const newlyUnlocked = [];
    let rewardXP = 0;

    for (const achievement of ACHIEVEMENTS) {
        const value = stats[achievement.metric] || 0;
        if (value >= achievement.target && !unlocked.some((item) => item.achievementId === achievement.id)) {
            unlocked.push({ achievementId: achievement.id, unlockedAt: new Date(), rewardGranted: true });
            rewardXP += achievement.rewardXP;
            newlyUnlocked.push(achievement);
        }
    }

    const dateKey = formatDateString(new Date());
    const weekKey = getWeekKey(new Date());
    const dailyChallenges = user.gamification?.dailyChallenges || [];
    const weeklyChallenges = user.gamification?.weeklyChallenges || [];
    const currentDaily = challengeDefinitions(stats, new Date()).map((definition) => {
        let challenge = dailyChallenges.find((item) => item.challengeId === definition.id && item.dateKey === dateKey);
        if (!challenge) {
            challenge = { ...definition, dateKey, current: 0, target: definition.target, rewardGranted: false };
            dailyChallenges.push(challenge);
        }
        challenge.current = Math.min(definition.target, stats[definition.metric] || 0);
        if (challenge.current >= challenge.target && !challenge.rewardGranted) {
            challenge.completedAt = new Date();
            challenge.rewardGranted = true;
            rewardXP += definition.rewardXP;
        }
        return { ...definition, current: challenge.current, target: challenge.target, completed: challenge.rewardGranted, dateKey };
    });
    const currentWeekly = weeklyDefinitions.map((definition) => {
        let challenge = weeklyChallenges.find((item) => item.challengeId === definition.id && item.weekKey === weekKey);
        if (!challenge) {
            challenge = { ...definition, weekKey, current: 0, target: definition.target, rewardGranted: false };
            weeklyChallenges.push(challenge);
        }
        challenge.current = Math.min(definition.target, stats[definition.metric] || 0);
        if (challenge.current >= challenge.target && !challenge.rewardGranted) {
            challenge.completedAt = new Date();
            challenge.rewardGranted = true;
            rewardXP += definition.rewardXP;
        }
        return { ...definition, current: challenge.current, target: challenge.target, completed: challenge.rewardGranted, weekKey };
    });

    const previousLevel = getLevel(user.xp || 0).level;
    user.xp = (user.xp || 0) + rewardXP;
    const level = getLevel(user.xp);
    const levelUp = level.level > (user.gamification?.lastLevel || previousLevel);
    user.longestStreak = stats.longestStreak;
    user.gamification = {
        achievements: unlocked,
        dailyChallenges: dailyChallenges.slice(-30),
        weeklyChallenges: weeklyChallenges.slice(-12),
        lastLevel: Math.max(user.gamification?.lastLevel || 1, level.level)
    };
    await user.save();

    return {
        stats,
        achievements: ACHIEVEMENTS.map((achievement) => ({
            ...achievement,
            progress: Math.min(achievement.target, stats[achievement.metric] || 0),
            unlocked: unlocked.some((item) => item.achievementId === achievement.id)
        })),
        dailyChallenges: currentDaily,
        weeklyChallenges: currentWeekly,
        level,
        xp: user.xp,
        newlyUnlocked,
        rewardXP,
        levelUp
    };
};

module.exports = { LEVELS, ACHIEVEMENTS, getLevel, evaluateGamification };
const Plan = require('../models/Plan');
const Task = require('../models/Task');
const { generateTaskBreakdown } = require('../services/groqService');
const { checkFeasibility } = require('../services/feasibilityService');
const { scheduleTasks } = require('../services/schedulingService');
const { rescuePlan } = require('../services/rescueService');
const { calculatePlanHealth } = require('../services/healthService');
const { getStartOfDay } = require('../utils/dateUtils');

// @desc    Generate plan task breakdown preview with AI and Feasibility Check
// @route   POST /api/plans/generate
// @access  Private
const generatePlanPreview = async (req, res, next) => {
  try {
    const {
      title,
      description,
      category,
      topics,
      startDate,
      deadline,
      availableMinutesPerDay,
      sessionLength,
      difficulty,
      priority
    } = req.body;

    if (!title || !deadline || !availableMinutesPerDay) {
      return res.status(400).json({ message: 'Title, deadline, and daily available time are required.' });
    }

    const parsedStartDate = startDate ? new Date(startDate) : new Date();
    const parsedDeadline = new Date(deadline);

    if (parsedDeadline <= parsedStartDate) {
      return res.status(400).json({ message: 'Deadline must be after the start date.' });
    }

    // Call Groq / fallback service
    const breakdown = await generateTaskBreakdown({
      title,
      description,
      topics,
      availableMinutesPerDay,
      sessionLength: parseInt(sessionLength) || 45,
      difficulty: difficulty || 'medium',
      priority: priority || 'medium'
    });

    // Check feasibility
    const feasibility = checkFeasibility(
      parsedStartDate,
      parsedDeadline,
      parseInt(availableMinutesPerDay),
      breakdown.estimatedTotalMinutes
    );

    res.json({
      breakdown,
      feasibility,
      inputs: {
        title,
        category: category || 'Coding',
        description,
        topics: Array.isArray(topics) ? topics : [topics],
        startDate: parsedStartDate,
        deadline: parsedDeadline,
        availableMinutesPerDay: parseInt(availableMinutesPerDay),
        sessionLength: parseInt(sessionLength) || 45,
        difficulty: difficulty || 'medium',
        priority: priority || 'medium'
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create and save new plan + micro-tasks
// @route   POST /api/plans
// @access  Private
const createPlan = async (req, res, next) => {
  try {
    const {
      title,
      category,
      description,
      topics,
      startDate,
      deadline,
      availableMinutesPerDay,
      sessionLength,
      difficulty,
      priority,
      tasks
    } = req.body;

    const parsedStartDate = startDate ? new Date(startDate) : new Date();
    const parsedDeadline = new Date(deadline);

    // Calculate total estimated minutes
    const estimatedTotalMinutes = Array.isArray(tasks)
      ? tasks.reduce((sum, t) => sum + (parseInt(t.estimatedMinutes) || 45), 0)
      : 0;

    const feasibility = checkFeasibility(
      parsedStartDate,
      parsedDeadline,
      parseInt(availableMinutesPerDay),
      estimatedTotalMinutes
    );

    const plan = await Plan.create({
      userId: req.user._id,
      title,
      category: category || 'Skill Learning',
      description: description || '',
      topics: Array.isArray(topics) ? topics : [],
      startDate: parsedStartDate,
      deadline: parsedDeadline,
      availableMinutesPerDay: parseInt(availableMinutesPerDay),
      sessionLength: parseInt(sessionLength) || 45,
      difficulty: difficulty || 'medium',
      priority: priority || 'medium',
      estimatedTotalMinutes,
      feasible: feasibility.isFeasible,
      healthScore: 100,
      status: 'active'
    });

    // Schedule tasks across dates
    const scheduled = scheduleTasks(tasks || [], parsedStartDate, parsedDeadline, parseInt(availableMinutesPerDay));

    // Save tasks into DB
    const taskDocs = await Promise.all(
      scheduled.map(t =>
        Task.create({
          userId: req.user._id,
          planId: plan._id,
          title: t.title,
          description: t.description || '',
          scheduledDate: t.scheduledDate,
          estimatedMinutes: t.estimatedMinutes || 45,
          priority: t.priority || priority || 'medium',
          difficulty: t.difficulty || difficulty || 'medium',
          status: 'pending'
        })
      )
    );

    res.status(201).json({
      plan,
      tasks: taskDocs,
      feasibility
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all plans for logged in user
// @route   GET /api/plans
// @access  Private
const getPlans = async (req, res, next) => {
  try {
    const plans = await Plan.find({ userId: req.user._id }).sort({ createdAt: -1 });

    // Calculate live health score and task counts for each plan
    const updatedPlans = await Promise.all(
      plans.map(async (plan) => {
        const tasks = await Task.find({ planId: plan._id });
        
        // Auto check for missed tasks (if scheduledDate < today & status == pending)
        const today = getStartOfDay(new Date());
        let updatedMissed = false;
        for (const t of tasks) {
          if (t.status === 'pending' && getStartOfDay(t.scheduledDate) < today) {
            t.status = 'missed';
            await t.save();
            updatedMissed = true;
          }
        }

        const freshTasks = updatedMissed ? await Task.find({ planId: plan._id }) : tasks;
        const { healthScore, healthStatus } = calculatePlanHealth(plan, freshTasks);

        plan.healthScore = healthScore;
        plan.status = healthScore < 50 ? 'at_risk' : plan.status;
        await plan.save();

        const completedCount = freshTasks.filter(t => t.status === 'completed').length;
        const totalCount = freshTasks.length;
        const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

        return {
          ...plan.toObject(),
          healthScore,
          healthStatus,
          completedCount,
          totalCount,
          progressPct
        };
      })
    );

    res.json(updatedPlans);
  } catch (error) {
    next(error);
  }
};

// @desc    Get single plan by ID
// @route   GET /api/plans/:id
// @access  Private
const getPlanById = async (req, res, next) => {
  try {
    const plan = await Plan.findOne({ _id: req.params.id, userId: req.user._id });
    if (!plan) {
      return res.status(404).json({ message: 'Plan not found' });
    }

    const tasks = await Task.find({ planId: plan._id }).sort({ scheduledDate: 1 });

    // Auto mark overdue pending tasks as missed
    const today = getStartOfDay(new Date());
    for (const t of tasks) {
      if (t.status === 'pending' && getStartOfDay(t.scheduledDate) < today) {
        t.status = 'missed';
        await t.save();
      }
    }

    const freshTasks = await Task.find({ planId: plan._id }).sort({ scheduledDate: 1 });
    const { healthScore, healthStatus } = calculatePlanHealth(plan, freshTasks);

    plan.healthScore = healthScore;
    await plan.save();

    const completedCount = freshTasks.filter(t => t.status === 'completed').length;
    const missedCount = freshTasks.filter(t => t.status === 'missed').length;
    const remainingCount = freshTasks.filter(t => t.status !== 'completed').length;
    const progressPct = freshTasks.length > 0 ? Math.round((completedCount / freshTasks.length) * 100) : 0;

    res.json({
      plan: {
        ...plan.toObject(),
        healthScore,
        healthStatus,
        completedCount,
        missedCount,
        remainingCount,
        progressPct
      },
      tasks: freshTasks
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete plan
// @route   DELETE /api/plans/:id
// @access  Private
const deletePlan = async (req, res, next) => {
  try {
    const plan = await Plan.findOne({ _id: req.params.id, userId: req.user._id });
    if (!plan) {
      return res.status(404).json({ message: 'Plan not found' });
    }

    await Task.deleteMany({ planId: plan._id });
    await plan.deleteOne();

    res.json({ message: 'Plan deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc    ⚡ RESCUE MY PLAN - Intelligent Rescheduling Workflow
// @route   POST /api/plans/:id/rescue
// @access  Private
const rescuePlanController = async (req, res, next) => {
  try {
    const { updatedAvailableMinutesPerDay } = req.body;
    const planId = req.params.id;

    const rescueResult = await rescuePlan(planId, req.user._id, updatedAvailableMinutesPerDay);

    res.json({
      message: 'Plan rescued successfully! ⚡',
      ...rescueResult
    });
  } catch (error) {
    next(error);
  }
};

// @desc    ⚡ Quick Adaptation Feature: "I Have Less Time Today"
// @route   POST /api/plans/:id/quick-adapt
// @access  Private
const quickAdaptPlan = async (req, res, next) => {
  try {
    const { todayAvailableMinutes } = req.body; // e.g. 30, 60, 120
    const planId = req.params.id;

    const plan = await Plan.findOne({ _id: planId, userId: req.user._id });
    if (!plan) return res.status(404).json({ message: 'Plan not found' });

    const today = getStartOfDay(new Date());
    const todayTasks = await Task.find({
      planId,
      scheduledDate: { $gte: today, $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000) },
      status: { $in: ['pending', 'active', 'rescheduled'] }
    });

    if (todayTasks.length === 0) {
      return res.json({ message: 'No pending tasks found for today.', movedCount: 0 });
    }

    let allocated = 0;
    let movedCount = 0;
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    for (const task of todayTasks) {
      if (allocated + task.estimatedMinutes <= todayAvailableMinutes) {
        allocated += task.estimatedMinutes;
      } else {
        // Push task to tomorrow
        task.scheduledDate = tomorrow;
        task.status = 'rescheduled';
        await task.save();
        movedCount++;
      }
    }

    res.json({
      message: `Adapted today schedule! Moved ${movedCount} task(s) to tomorrow.`,
      movedCount
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  generatePlanPreview,
  createPlan,
  getPlans,
  getPlanById,
  deletePlan,
  rescuePlanController,
  quickAdaptPlan
};

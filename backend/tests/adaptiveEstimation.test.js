const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const express = require('express');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');
const User = require('../models/User');
const Task = require('../models/Task');
const Plan = require('../models/Plan');
const adaptive = require('../services/adaptiveEstimationService');
const { focusMilliseconds } = require('../services/focusTimeService');
const { scheduleTasks } = require('../services/schedulingService');
const { formatDateKey } = require('../utils/dateUtils');
const { rescuePlan } = require('../services/rescueService');
const groq = require('../services/groqService');
let mongo, app, user, plan;
before(async () => {
  mongo = await MongoMemoryServer.create(); await mongoose.connect(mongo.getUri());
  groq.generateTaskBreakdown = async () => ({ tasks: [{ title: 'Generated task', estimatedMinutes: 45 }], estimatedTotalMinutes: 45 });
  app = express(); app.use(express.json());
  app.use(async (req, res, next) => { req.user = await User.findById(user._id); next(); });
  const tasks = require('../controllers/taskController');
  const plans = require('../controllers/planController');
  app.patch('/tasks/:id/heartbeat', tasks.heartbeatTask); app.patch('/tasks/:id/start', tasks.startTask); app.patch('/tasks/:id/pause', tasks.pauseTask); app.patch('/tasks/:id/complete', tasks.completeTask);
  app.post('/plans', plans.createPlan); app.post('/generate', plans.generatePlanPreview); app.post('/plans/:id/quick-adapt', plans.quickAdaptPlan);
  app.get('/analytics', require('../controllers/analyticsController').getAnalytics);
  app.patch('/settings', require('../controllers/authController').updateSettings);
  app.use((error, req, res, next) => res.status(500).json({ message: error.message }));
});
after(async () => { await mongoose.disconnect(); if (mongo) await mongo.stop(); });
beforeEach(async () => {
  await Promise.all([User.deleteMany({}), Task.deleteMany({}), Plan.deleteMany({})]);
  user = await User.create({ name: 'Learner', email: 'pace@example.test', password: 'test-only' });
  plan = await Plan.create({ userId: user._id, title: 'Study', deadline: new Date(Date.now() + 6 * 86400000), availableMinutesPerDay: 90 });
});
const taskFor = base => Task.create({ userId: user._id, planId: plan._id, title: 'Task', estimatedMinutes: base, scheduledDate: new Date() });
const completeFocus = async (base, actual) => {
  const task = await taskFor(base);
  assert.equal((await request(app).patch(`/tasks/${task._id}/start`)).status, 200);
  // Simulate elapsed ACTIVE time in an isolated DB, never trusting API-supplied minutes.
  await Task.updateOne({ _id: task._id }, { $set: { focusAccumulatedMs: actual * 60000, focusRunningSince: null } });
  const response = await request(app).patch(`/tasks/${task._id}/complete`).send({ focusSession: true });
  assert.equal(response.status, 200, JSON.stringify(response.body));
  return response.body;
};
test('three focus completions learn pace; generation, feasibility, scheduling and analytics use it', async () => {
  for (const [i, pair] of [[45, 55], [60, 72], [30, 38]].entries()) {
    const result = await completeFocus(...pair);
    assert.equal(result.learningPace.sampleCount, i + 1);
    if (i < 2) assert.equal(result.learningPace.globalMultiplier, 1);
  }
  const learned = await User.findById(user._id);
  assert.ok(learned.learningPace.globalMultiplier > 1);
  assert.ok(adaptive.getAdaptiveEstimate(learned, 45) > 45);
  const inputs = { title: 'Future', startDate: new Date(), deadline: plan.deadline, availableMinutesPerDay: 90 };
  const generated = await request(app).post('/generate').send(inputs);
  assert.equal(generated.status, 200, JSON.stringify(generated.body));
  const task = generated.body.breakdown.tasks[0];
  assert.equal(task.baseEstimatedMinutes, 45); assert.equal(task.adaptiveEstimatedMinutes, 50);
  assert.equal(generated.body.feasibility.estimatedTotalMinutes, 50);
  const created = await request(app).post('/plans').send({ ...inputs, tasks: [task, task] });
  assert.equal(created.status, 201, JSON.stringify(created.body));
  assert.equal(created.body.plan.estimatedTotalMinutes, 100);
  assert.notEqual(created.body.tasks[0].scheduledDate, created.body.tasks[1].scheduledDate);
  assert.equal(created.body.tasks[0].baseEstimatedMinutes, 45);
  const analytics = await request(app).get('/analytics');
  assert.equal(analytics.body.learningPace.actualMinutes, 165);
  assert.equal(analytics.body.learningPace.estimatedMinutes, 135);
  assert.equal(analytics.body.learningPace.sampleCount, 3);
});
test('faster learners adapt moderately; outliers and manual completion never train', async () => {
  for (const actual of [45, 50, 48]) await completeFocus(60, actual);
  let learned = await User.findById(user._id);
  assert.ok(learned.learningPace.globalMultiplier < 1);
  const before = learned.learningPace.sampleCount;
  await completeFocus(45, 300); await completeFocus(45, 2);
  const manual = await taskFor(45);
  const response = await request(app).patch(`/tasks/${manual._id}/complete`).send({ actualFocusMinutes: 60 });
  assert.equal(response.status, 200);
  assert.equal(response.body.task.actualFocusMinutes, 0); assert.ok(response.body.xpGained >= 50);
  learned = await User.findById(user._id); assert.equal(learned.learningPace.sampleCount, before);
});
test('paused time excluded, repeated start/pause idempotent, completion cannot duplicate a sample', async () => {
  assert.equal(focusMilliseconds({ focusAccumulatedMs: 20 * 60000, focusRunningSince: new Date(40 * 60000) }, 60 * 60000), 40 * 60000);
  assert.equal(focusMilliseconds({ focusAccumulatedMs: 20 * 60000, focusRunningSince: null }, 60 * 60000), 20 * 60000);
  const task = await taskFor(45);
  const first = await request(app).patch(`/tasks/${task._id}/start`);
  const second = await request(app).patch(`/tasks/${task._id}/start`);
  assert.equal(first.body.focusRunningSince, second.body.focusRunningSince);
  await Task.updateOne({ _id: task._id }, { $set: { focusRunningSince: new Date(Date.now() - 20 * 60000) } });
  const paused = await request(app).patch(`/tasks/${task._id}/pause`);
  const pausedAgain = await request(app).patch(`/tasks/${task._id}/pause`);
  assert.equal(paused.body.focusAccumulatedMs, pausedAgain.body.focusAccumulatedMs);
  await request(app).patch(`/tasks/${task._id}/start`);
  await Task.updateOne({ _id: task._id }, { $set: { focusRunningSince: new Date(Date.now() - 20 * 60000) } });
  const results = await Promise.all([request(app).patch(`/tasks/${task._id}/complete`).send({ focusSession: true }), request(app).patch(`/tasks/${task._id}/complete`).send({ focusSession: true })]);
  assert.deepEqual(results.map(r => r.status).sort(), [200, 409]);
  const done = await Task.findById(task._id); assert.ok(Math.abs(done.actualFocusMinutes - 40) < 0.1);
  assert.equal((await User.findById(user._id)).learningPace.sampleCount, 1);
});
test('Rescue personalizes only unfinished tasks and keeps dates within range', async () => {
  const done = await completeFocus(45, 55);
  const history = (await Task.findById(done.task._id)).toObject();
  await User.updateOne({ _id: user._id }, { $set: { 'learningPace.globalMultiplier': 1.3, 'learningPace.sampleCount': 3 } });
  for (let i = 0; i < 4; i++) await taskFor(45);
  const rescued = await rescuePlan(plan._id, user._id);
  assert.equal(rescued.remainingEstimatedMinutes, 240); // 4 x 58.5 rounded to 60
  assert.equal(rescued.feasibility.estimatedTotalMinutes, 240);
  for (const task of rescued.rescheduledTasks) {
    assert.equal(task.baseEstimatedMinutes, 45); assert.equal(task.adaptiveEstimatedMinutes, 60);
    assert.ok(task.scheduledDate <= rescued.plan.deadline);
    assert.ok(task.scheduledDate >= new Date(new Date(rescued.plan.startDate).setHours(0,0,0,0)));
  }
  assert.deepEqual((await Task.findById(done.task._id)).toObject(), history);
});
test('first user unchanged, opt-out applies base to new plans and rescue without deleting learning', async () => {
  assert.equal(adaptive.getAdaptiveEstimate(user, 43), 43);
  assert.equal(adaptive.getEffectiveEstimatedMinutes({ estimatedMinutes: 43 }), 43);
  await User.updateOne({ _id: user._id }, { $set: { 'learningPace.globalMultiplier': 1.3, 'learningPace.sampleCount': 3 } });
  assert.equal((await request(app).patch('/settings').send({ adaptiveTimeEstimation: false })).status, 200);
  const learned = await User.findById(user._id);
  assert.equal(learned.learningPace.sampleCount, 3); assert.equal(adaptive.getAdaptiveEstimate(learned, 45), 45);
  await taskFor(45); const rescue = await rescuePlan(plan._id, user._id);
  assert.equal(rescue.remainingEstimatedMinutes, 45);
  assert.equal(rescue.rescheduledTasks[0].estimationSource, 'groq');
});
test('EMA bounds, accuracy and calendar boundaries are deterministic', () => {
  assert.equal(adaptive.calculateEstimateAccuracy(50, 55), 90);
  assert.equal(adaptive.getAdaptiveEstimate({ learningPace: { sampleCount: 3, globalMultiplier: 5 } }, 60), 105);
  assert.equal(adaptive.getAdaptiveEstimate({ learningPace: { sampleCount: 3, globalMultiplier: 0.1 } }, 60), 40);
  const start = new Date(2026, 8, 15), end = new Date(2026, 8, 17);
  const scheduled = scheduleTasks(Array.from({ length: 8 }, () => ({ estimatedMinutes: 45, adaptiveEstimatedMinutes: 60 })), start, end, 90);
  assert.ok(scheduled.every(task => formatDateKey(task.scheduledDate) >= formatDateKey(start) && formatDateKey(task.scheduledDate) <= formatDateKey(end)));
});
test('Quick Adjust updates estimates explicitly and never pushes work beyond deadline', async () => {
  await User.updateOne({ _id: user._id }, { $set: { 'learningPace.globalMultiplier': 1.3, 'learningPace.sampleCount': 3 } });
  await taskFor(45); await taskFor(45);
  const response = await request(app).post(`/plans/${plan._id}/quick-adapt`).send({ todayAvailableMinutes: 90 });
  assert.equal(response.status, 200); assert.equal(response.body.movedCount, 1);
  assert.ok((await Task.find({ planId: plan._id })).every(task => task.adaptiveEstimatedMinutes === 60));
  await Plan.updateOne({ _id: plan._id }, { $set: { deadline: new Date() } });
  const denied = await request(app).post(`/plans/${plan._id}/quick-adapt`).send({ todayAvailableMinutes: 10 });
  assert.equal(denied.status, 409);
});

test('forgotten timers expire their active lease; heartbeat persists time and cannot resume a paused session', async () => {
  const task = await taskFor(45);
  await request(app).patch(`/tasks/${task._id}/start`);
  const old = new Date(Date.now() - 10 * 60000);
  await Task.updateOne({ _id: task._id }, { $set: { focusRunningSince: old, focusHeartbeatAt: old } });
  const heartbeat = await request(app).patch(`/tasks/${task._id}/heartbeat`);
  assert.equal(heartbeat.status, 200); assert.equal(heartbeat.body.focusAccumulatedMs, 45000);
  await request(app).patch(`/tasks/${task._id}/pause`);
  assert.equal((await request(app).patch(`/tasks/${task._id}/heartbeat`)).status, 409);
});
test('concurrent distinct sample updates do not lose aggregate history', async () => {
  const samples = [55, 60, 65].map(actualFocusMinutes => ({ status: 'completed', focusRecorded: true, estimatedMinutes: 45, actualFocusMinutes }));
  await Promise.all(samples.map(task => adaptive.updateUserPace(user._id, task)));
  const learned = await User.findById(user._id);
  assert.equal(learned.learningPace.sampleCount, 3);
  assert.equal(learned.learningPace.actualMinutes, 180);
  assert.equal(learned.learningPace.estimatedMinutes, 135);
});

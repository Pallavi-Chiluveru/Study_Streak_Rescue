const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { installResendFetchMock } = require('./resendFetchMock');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongo;
let user;
let sent;
let failSend = false;
let restoreFetch;
Object.assign(process.env, {
  CLIENT_URL: 'https://study.example.test',
  RESEND_API_KEY: 're_synthetic_test_only',
  EMAIL_FROM: 'Study Streak <sender@example.test>'
});
restoreFetch = installResendFetchMock({
  messages: {
    push(message) { sent.push(message); }
  },
  shouldFail: () => failSend
});

const User = require('../models/User');
const Notification = require('../models/Notification');
const EmailDelivery = require('../models/EmailDelivery');
const Plan = require('../models/Plan');
const Task = require('../models/Task');
const { createNotification, claimImpact } = require('../services/notificationService');
const { decideDeliveryChannels } = require('../services/notificationPolicyService');
const { dateKey, daysBetweenKeys, evaluateUserNotifications } = require('../services/notificationEvaluationService');

before(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
});
after(async () => {
  await mongoose.disconnect();
  await mongo.stop();
  restoreFetch();
});
beforeEach(async () => {
  sent = [];
  failSend = false;
  await Promise.all([User.deleteMany({}), Notification.deleteMany({}), EmailDelivery.deleteMany({}), Plan.deleteMany({}), Task.deleteMany({})]);
  user = await User.create({ name: 'Learner Example', email: 'learner@example.test', password: 'test-only' });
});

const highAlert = dedupeKey => ({
  user, eventType: 'MULTIPLE_TASKS_MISSED', severity: 'high', dedupeKey,
  title: 'Three tasks need attention', message: 'Your plan needs a rescue.',
  actionLabel: 'Rescue My Plan', actionUrl: '/plans/example',
  email: {
    subject: 'A few study tasks need your attention', title: 'Your plan needs attention',
    message: 'Three tasks are overdue.', metrics: [{ label: 'Overdue tasks', value: '3' }],
    actionLabel: 'Rescue My Plan', actionUrl: 'https://study.example.test/plans/example'
  }
});

test('channel policy keeps routine and single missed events in-app only', () => {
  const preferences = user.preferences.notifications.toObject();
  assert.deepEqual(decideDeliveryChannels({ eventType: 'TASK_DUE_TODAY', severity: 'low', userPreferences: preferences }), { inApp: true, email: false });
  assert.deepEqual(decideDeliveryChannels({ eventType: 'TASK_MISSED', severity: 'medium', userPreferences: preferences }), { inApp: true, email: false });
  assert.deepEqual(decideDeliveryChannels({ eventType: 'PLAN_HEALTH_CRITICAL', severity: 'critical', userPreferences: preferences }), { inApp: true, email: true });
});

test('high alerts persist and email exactly once for the same dedupe key', async () => {
  await createNotification(highAlert('MISSED:plan:week'));
  await createNotification(highAlert('MISSED:plan:week'));
  assert.equal(await Notification.countDocuments(), 1);
  assert.equal(await EmailDelivery.countDocuments(), 1);
  assert.equal(sent.length, 1);
  assert.equal(sent[0].to, user.email);
});

test('email disabled keeps the in-app critical alert and sends no study email', async () => {
  user.preferences.notifications.email.enabled = false;
  await user.save();
  await createNotification({ ...highAlert('CRITICAL:disabled'), user, eventType: 'PLAN_HEALTH_CRITICAL', severity: 'critical' });
  assert.equal(await Notification.countDocuments(), 1);
  assert.equal(await EmailDelivery.countDocuments(), 0);
  assert.equal(sent.length, 0);
});

test('Resend failure does not remove the in-app alert and is recorded safely', async () => {
  failSend = true;
  const originalError = console.error;
  console.error = () => {};
  try { await createNotification(highAlert('MISSED:failure')); } finally { console.error = originalError; }
  assert.equal(await Notification.countDocuments(), 1);
  assert.equal((await EmailDelivery.findOne()).status, 'failed');
});

test('timezone calendar keys avoid UTC day shifts', () => {
  const instant = new Date('2026-09-12T20:00:00Z');
  assert.equal(dateKey(instant, 'Asia/Kolkata'), '2026-09-13');
  assert.equal(dateKey(instant, 'America/New_York'), '2026-09-12');
  assert.equal(daysBetweenKeys('2026-09-12', '2026-09-15'), 3);
});
test('a single newly missed ordinary task stays in-app only', async () => {
  const plan = await Plan.create({
    userId: user._id, title: 'Ordinary study plan', priority: 'medium',
    startDate: new Date(Date.now() - 3 * 86400000), deadline: new Date(Date.now() + 10 * 86400000),
    availableMinutesPerDay: 120
  });
  await Task.create({
    userId: user._id, planId: plan._id, title: 'Trees Practice',
    scheduledDate: new Date(Date.now() - 2 * 86400000), estimatedMinutes: 45, status: 'pending'
  });
  await evaluateUserNotifications(user);
  const types = (await Notification.find({})).map(item => item.type);
  assert.ok(types.includes('TASK_MISSED'));
  assert.equal(await EmailDelivery.countDocuments(), 0);
});

test('multiple missed work, critical health, infeasibility, and deadline alerts deduplicate across evaluations', async () => {
  const plan = await Plan.create({
    userId: user._id, title: 'Important exam', priority: 'high',
    startDate: new Date(Date.now() - 5 * 86400000), deadline: new Date(Date.now() + 3 * 86400000),
    availableMinutesPerDay: 15
  });
  for (let index = 0; index < 3; index += 1) await Task.create({
    userId: user._id, planId: plan._id, title: 'Overdue ' + index,
    scheduledDate: new Date(Date.now() - 2 * 86400000), estimatedMinutes: 90, status: 'missed'
  });
  await evaluateUserNotifications(user);
  const firstNotifications = await Notification.countDocuments();
  const firstDeliveries = await EmailDelivery.countDocuments();
  const types = new Set((await Notification.find({})).map(item => item.type));
  assert.ok(types.has('MULTIPLE_TASKS_MISSED'));
  assert.ok(types.has('PLAN_HEALTH_CRITICAL'));
  assert.ok(types.has('GOAL_DEADLINE_SOON'));
  assert.ok(types.has('PLAN_INFEASIBLE'));
  await evaluateUserNotifications(user);
  assert.equal(await Notification.countDocuments(), firstNotifications);
  assert.equal(await EmailDelivery.countDocuments(), firstDeliveries);
});
test('Start Early action moves tomorrow task to today and starts focus', async () => {
  const plan = await Plan.create({
    userId: user._id, title: 'Early study', deadline: new Date(Date.now() + 5 * 86400000), availableMinutesPerDay: 120
  });
  const task = await Task.create({
    userId: user._id, planId: plan._id, title: 'Tomorrow topic',
    scheduledDate: new Date(Date.now() + 86400000), estimatedMinutes: 30, status: 'pending'
  });
  let response;
  await require('../controllers/taskController').startTaskEarly(
    { params: { id: String(task._id) }, user: { _id: user._id } },
    { status() { return this; }, json(value) { response = value; } },
    error => { throw error; }
  );
  assert.equal(response.status, 'active');
  assert.equal(dateKey(response.scheduledDate, user.timezone), dateKey(new Date(), user.timezone));
  assert.ok(response.focusRunningSince);
});
test('critical impact is atomically claimable only once', async () => {
  const { notification } = await createNotification({
    user, eventType: 'PLAN_HEALTH_CRITICAL', severity: 'critical', dedupeKey: 'CRITICAL:impact-once',
    title: 'Your plan is at risk', message: 'Plan Health dropped below 40%.', impactEligible: true
  });
  assert.ok(await claimImpact(user._id, notification._id));
  assert.equal(await claimImpact(user._id, notification._id), null);
  assert.ok((await Notification.findById(notification._id)).impactClaimedAt);
});
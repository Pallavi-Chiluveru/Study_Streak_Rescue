const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');
const nodemailer = require('nodemailer');
const User = require('../models/User');
const Token = require('../models/PasswordResetToken');
const service = require('../services/passwordResetService');
let mongo, app, account, auth, mail, rejectEmail;
const originalTransport = nodemailer.createTransport;
const password = 'NewPassword123';
const body = token => ({ token, newPassword: password, confirmPassword: password });
const rawToken = () => new URL(mail.text.match(/https?:\/\/\S+/)[0]).searchParams.get('token');
before(async () => {
  process.env.JWT_SECRET = crypto.randomBytes(32).toString('hex');
  Object.assign(process.env, { EMAIL_HOST: 'smtp.example.test', EMAIL_PORT: '587', EMAIL_SECURE: 'false', EMAIL_USER: 'test', EMAIL_PASS: 'test', EMAIL_FROM: 'Study Streak <test@example.test>', CLIENT_URL: 'https://study.example.test' });
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  await Promise.all([User.init(), Token.init()]);
  nodemailer.createTransport = options => {
    assert.equal(options.requireTLS, true);
    return { sendMail: async message => {
      if (rejectEmail) throw new Error('private SMTP failure');
      mail = message;
      return { accepted: [message.to] };
    } };
  };
});
beforeEach(async () => {
  await Promise.all([User.deleteMany({}), Token.deleteMany({})]);
  mail = null; rejectEmail = false;
  delete require.cache[require.resolve('../routes/authRoutes')];
  app = express(); app.use(express.json()); app.use('/api/auth', require('../routes/authRoutes')); app.use('/api/goals', require('../routes/goalRoutes'));
  const registered = await request(app).post('/api/auth/register').send({ name: 'Test Learner', email: 'learner@example.test', password: 'OldPassword123' });
  assert.equal(registered.status, 201);
  account = registered.body; auth = `Bearer ${account.token}`;
});
after(async () => {
  nodemailer.createTransport = originalTransport;
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
});
test('registered-email request, hashed persistence, reset, old JWT and password rejected, new login succeeds', async () => {
  const response = await request(app).post('/api/auth/request-password-change').set('Authorization', auth).send({ email: 'victim@example.test', userId: 'other' });
  assert.equal(response.status, 200);
  assert.equal(mail.to, account.email);
  assert.equal(mail.subject, 'Change your Study Streak Rescue password');
  assert.match(mail.html, /Change Password/);
  const token = rawToken();
  assert.match(token, /^[a-f0-9]{64}$/);
  const record = await Token.findOne({ userId: account._id }).lean();
  assert.equal(record.tokenHash, crypto.createHash('sha256').update(token).digest('hex'));
  assert.ok(!JSON.stringify(record).includes(token));
  assert.ok(!JSON.stringify(response.body).includes(token));
  assert.ok(record.expiresAt - Date.now() <= 900000 && record.expiresAt - Date.now() > 890000);
  assert.equal((await request(app).post('/api/auth/reset-password').send(body(token))).status, 200);
  assert.equal((await request(app).post('/api/auth/reset-password').send(body(token))).status, 400);
  assert.equal((await request(app).get('/api/auth/me').set('Authorization', auth)).status, 401);
  assert.equal((await request(app).post('/api/auth/login').send({ email: account.email, password: 'OldPassword123' })).status, 401);
  const login = await request(app).post('/api/auth/login').send({ email: account.email, password });
  assert.equal(login.status, 200);
  assert.equal((await request(app).get('/api/auth/me').set('Authorization', `Bearer ${login.body.token}`)).status, 200);
  const updated = await User.findById(account._id);
  assert.notEqual(updated.password, password);
  assert.ok(await bcrypt.compare(password, updated.password));
  assert.ok(updated.passwordChangedAt);
});
test('authentication is mandatory', async () => {
  assert.equal((await request(app).post('/api/auth/request-password-change')).status, 401);
  assert.equal(await Token.countDocuments(), 0);
});
test('validation rejects mismatch, short passwords, excessive bcrypt bytes and malformed tokens without consuming link', async () => {
  await service.requestChange(account._id); const token = rawToken();
  for (const payload of [
    { ...body(token), confirmPassword: 'different' },
    { token, newPassword: 'short', confirmPassword: 'short' },
    { token, newPassword: 'a'.repeat(73), confirmPassword: 'a'.repeat(73) },
    { ...body(token), token: { $ne: null } }, { ...body(token), token: 'bad' },
    { ...body(token), token: '0'.repeat(64) }
  ]) assert.equal((await request(app).post('/api/auth/reset-password').send(payload)).status, 400);
  assert.equal((await request(app).post('/api/auth/reset-password').send(body(token))).status, 200);
});
test('expired link is rejected explicitly', async () => {
  await service.requestChange(account._id); const token = rawToken();
  await Token.updateOne({ userId: account._id }, { $set: { expiresAt: new Date(Date.now() - 1000) } });
  const response = await request(app).post('/api/auth/reset-password').send(body(token));
  assert.equal(response.status, 400); assert.equal(response.body.code, 'EXPIRED_TOKEN');
});
test('resend replaces older link', async () => {
  await service.requestChange(account._id); const old = rawToken();
  await service.requestChange(account._id); const fresh = rawToken();
  assert.notEqual(old, fresh); assert.equal(await Token.countDocuments(), 1);
  assert.equal((await request(app).post('/api/auth/reset-password').send(body(old))).status, 400);
  assert.equal((await request(app).post('/api/auth/reset-password').send(body(fresh))).status, 200);
});
test('concurrent resets have exactly one winner', async () => {
  await service.requestChange(account._id); const token = rawToken();
  const results = await Promise.all([request(app).post('/api/auth/reset-password').send(body(token)), request(app).post('/api/auth/reset-password').send(body(token))]);
  assert.deepEqual(results.map(r => r.status).sort(), [200, 400]);
});
test('email failure cleans up and returns a safe error', async () => {
  rejectEmail = true;
  const response = await request(app).post('/api/auth/request-password-change').set('Authorization', auth);
  assert.equal(response.status, 503); assert.equal(response.body.code, 'EMAIL_FAILED');
  assert.ok(!JSON.stringify(response.body).includes('private SMTP'));
  assert.equal(await Token.countDocuments(), 0);
});
test('requests are limited to five per hour', async () => {
  for (let i = 0; i < 5; i++) assert.equal((await request(app).post('/api/auth/request-password-change').set('Authorization', auth)).status, 200);
  const response = await request(app).post('/api/auth/request-password-change').set('Authorization', auth);
  assert.equal(response.status, 429); assert.ok(response.headers['retry-after']);
});
test('legacy JWTs accepted before change and rejected after, same-second new JWT accepted', async () => {
  const legacy = jwt.sign({ id: account._id }, process.env.JWT_SECRET);
  assert.equal((await request(app).get('/api/auth/me').set('Authorization', `Bearer ${legacy}`)).status, 200);
  const changedAt = new Date(Math.floor(Date.now() / 1000) * 1000 + 1);
  await User.updateOne({ _id: account._id }, { $set: { passwordChangedAt: changedAt } });
  assert.equal((await request(app).get('/api/auth/me').set('Authorization', `Bearer ${legacy}`)).status, 401);
  const fresh = jwt.sign({ id: account._id, passwordChangedAt: changedAt.getTime() }, process.env.JWT_SECRET);
  assert.equal((await request(app).get('/api/auth/me').set('Authorization', `Bearer ${fresh}`)).status, 200);
});

test('public reset endpoint rate limits malformed token attempts', async () => {
  for (let i = 0; i < 20; i++) assert.equal((await request(app).post('/api/auth/reset-password').send(body('bad'))).status, 400);
  assert.equal((await request(app).post('/api/auth/reset-password').send(body('bad'))).status, 429);
});
test('cleanup failure cannot report failure after the password was changed', async () => {
  await service.requestChange(account._id); const token = rawToken();
  const original = Token.deleteMany;
  Token.deleteMany = async () => { throw new Error('simulated cleanup outage'); };
  try {
    assert.equal((await request(app).post('/api/auth/reset-password').send(body(token))).status, 200);
    assert.equal((await request(app).post('/api/auth/reset-password').send(body(token))).status, 400);
  } finally { Token.deleteMany = original; }
});

const forgotRequest = async email => {
  const original = service.requestForgotPassword;
  let complete;
  const done = new Promise(resolve => { complete = resolve; });
  service.requestForgotPassword = async value => {
    try { await original(value); } finally { complete(); }
  };
  try {
    const response = await request(app).post('/api/auth/forgot-password').send({ email });
    if (response.status === 200) await done;
    return response;
  } finally { service.requestForgotPassword = original; }
};
test('forgot password normalizes email, uses shared link, resets password and revokes sessions', async () => {
  const response = await forgotRequest('  LEARNER@EXAMPLE.TEST  ');
  assert.equal(response.status, 200);
  assert.equal(mail.to, account.email);
  assert.equal(mail.subject, 'Reset your Study Streak Rescue password');
  assert.match(mail.html, /Reset Password/);
  const token = rawToken();
  const record = await Token.findOne({ userId: account._id }).lean();
  assert.equal(record.tokenHash, crypto.createHash('sha256').update(token).digest('hex'));
  assert.ok(!JSON.stringify(response.body).includes(token));
  assert.equal((await request(app).post('/api/auth/reset-password').send(body(token))).status, 200);
  assert.equal((await request(app).post('/api/auth/reset-password').send(body(token))).status, 400);
  assert.equal((await request(app).get('/api/auth/me').set('Authorization', auth)).status, 401);
  assert.equal((await request(app).post('/api/auth/login').send({ email: account.email, password: 'OldPassword123' })).status, 401);
  assert.equal((await request(app).post('/api/auth/login').send({ email: account.email, password })).status, 200);
});
test('unknown account and SMTP failure have identical public responses without sending to unknown accounts', async () => {
  const unknown = await forgotRequest('unknown@example.test');
  assert.equal(mail, null); assert.equal(await Token.countDocuments(), 0);
  const known = await forgotRequest(account.email);
  assert.deepEqual(known.body, unknown.body);
  rejectEmail = true;
  const failed = await forgotRequest(account.email);
  assert.equal(failed.status, unknown.status);
  assert.deepEqual(failed.body, unknown.body);
  assert.equal(await Token.countDocuments(), 0);
});
test('forgot password and change password replace each others tokens', async () => {
  await service.requestChange(account._id); const old = rawToken();
  await forgotRequest(account.email); const fresh = rawToken();
  assert.equal(await Token.countDocuments(), 1);
  assert.equal((await request(app).post('/api/auth/reset-password').send(body(old))).status, 400);
  await Token.updateOne({ userId: account._id }, { $set: { expiresAt: new Date(Date.now() - 1000) } });
  assert.equal((await request(app).post('/api/auth/reset-password').send(body(fresh))).body.code, 'EXPIRED_TOKEN');
});
test('forgot password validates input and limits requests independently of account existence', async () => {
  for (const email of [null, { $ne: null }, 'invalid'])
    assert.equal((await request(app).post('/api/auth/forgot-password').send({ email })).status, 400);
  for (let i = 0; i < 2; i++) assert.equal((await forgotRequest('unknown@example.test')).status, 200);
  assert.equal((await request(app).post('/api/auth/forgot-password').send({ email: account.email })).status, 429);
});

test('registration validates three-field payload without confirm password', async () => {
  const short = await request(app).post('/api/auth/register').send({ name: 'New Learner', email: 'new@example.test', password: 'short' });
  assert.equal(short.status, 400);
  assert.match(short.body.message, /8/);
  const invalidEmail = await request(app).post('/api/auth/register').send({ name: 'New Learner', email: 'invalid', password: 'LongPassword123' });
  assert.equal(invalidEmail.status, 400);
  const valid = await request(app).post('/api/auth/register').send({ name: '  New Learner  ', email: 'NEW@EXAMPLE.TEST', password: 'LongPassword123' });
  assert.equal(valid.status, 201);
  assert.equal(valid.body.email, 'new@example.test');
  assert.equal(valid.body.name, 'New Learner');
  assert.equal(valid.body.goalOnboarding.status, 'not_started');
});


test('fresh account can persist onboarding, create goals, preview and apply one master schedule', async () => {
  assert.equal(account.goalOnboarding.status, 'not_started');
  const initialProfile = await request(app).get('/api/goals/profile').set('Authorization', auth);
  assert.equal(initialProfile.status, 200);
  assert.equal(initialProfile.body.goalOnboarding.status, 'not_started');
  const started = await request(app).patch('/api/goals/onboarding').set('Authorization', auth).send({ status: 'in_progress', step: 1, draft: { mainAim: 'Balance study goals' } });
  assert.equal(started.status, 200);
  assert.equal(started.body.goalOnboarding.status, 'in_progress');

  const profile = await request(app).patch('/api/goals/profile').set('Authorization', auth).send({
    mainAim: 'Balance study goals',
    weeklyAvailability: [120,120,120,120,120,180,180],
    maximumDailyMinutes: 180,
    preferredSessionMinutes: 45,
    preferredStudyPeriod: 'evening',
    utilizationPreference: 'balanced',
    restDays: []
  });
  assert.equal(profile.status, 200);
  const invalidProfile = await request(app).patch('/api/goals/profile').set('Authorization', auth).send({
    weeklyAvailability: [1441,0,0,0,0,0,0]
  });
  assert.equal(invalidProfile.status, 400);

  const createdGoals = [];
  for (const [title,horizon,priority] of [['Short goal','short','high'],['Medium goal','medium','medium'],['Long goal','long','low']]) {
    const created = await request(app).post('/api/goals').set('Authorization', auth).send({
      title, category: 'Skill Development', horizon, priority, importance: 'important',
      weeklyMinutes: 45, minimumWeeklyMinutes: 0,
      cadence: { type: 'times_per_week', timesPerWeek: 1, daysOfWeek: [] }
    });
    assert.equal(created.status, 201);
    createdGoals.push(created.body);
  }
  const patched = await request(app).patch('/api/goals/'+createdGoals[0]._id).set('Authorization', auth).send({
    ...createdGoals[0], title: 'Updated short goal', createdAt: 'invalid-client-metadata', __v: 999
  });
  assert.equal(patched.status, 200);
  assert.equal(patched.body.title, 'Updated short goal');
  assert.notEqual(patched.body.__v, 999);
  const preview = await request(app).post('/api/goals/schedule/preview').set('Authorization', auth).send({});
  assert.equal(preview.status, 200);
  assert.equal(preview.body.feasible, true, JSON.stringify({validation:preview.body.validation,unscheduled:preview.body.unscheduled,conflicts:preview.body.conflicts,strategies:preview.body.strategies}));
  assert.equal(preview.body.strategies.length, 3);
  const applied = await request(app).post('/api/goals/schedule/'+preview.body.previewId+'/apply').set('Authorization', auth).send({});
  assert.equal(applied.status, 200);
  const me = await request(app).get('/api/auth/me').set('Authorization', auth);
  assert.equal(me.body.goalOnboarding.status, 'completed');
  const goals = await request(app).get('/api/goals').set('Authorization', auth);
  assert.equal(goals.body.goals.length, 3);
  assert.ok(applied.body.tasks.every(task => task.goalId));
});

test('fresh account skip persists across profile refresh', async () => {
  const skipped = await request(app).patch('/api/goals/onboarding').set('Authorization', auth).send({ status: 'skipped', step: 0 });
  assert.equal(skipped.status, 200);
  const me = await request(app).get('/api/auth/me').set('Authorization', auth);
  assert.equal(me.body.goalOnboarding.status, 'skipped');
});

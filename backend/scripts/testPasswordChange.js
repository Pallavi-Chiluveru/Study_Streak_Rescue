// Development-only integration check using the live Resend API and a disposable database.
const path = require('node:path');
require('dotenv').config({ path: path.join(__dirname, '../.env'), quiet: true });
const crypto = require('node:crypto');
const mongoose = require('mongoose');
const express = require('express');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');
const email = require('../services/emailService');
const User = require('../models/User');
const Token = require('../models/PasswordResetToken');
const forgot = process.argv.includes('--forgot');
let mongo, stage = 'startup', capturedToken;
const requireCheck = condition => { if (!condition) throw new Error('Verification failed'); };
(async () => {
  if (process.env.NODE_ENV === 'production') {
    console.error('Password-change verification is development-only.'); process.exitCode = 1; return;
  }
  try {
    stage = 'Resend configuration';
    requireCheck(await email.initializeEmailService());
    stage = 'frontend reset route';
    const resetPage = new URL('/reset-password', process.env.CLIENT_URL);
    const page = await fetch(resetPage, { signal: AbortSignal.timeout(10000) });
    requireCheck(page.ok && (await page.text()).includes('id="root"'));
    console.log('PASS: configured frontend serves the reset route.');
    stage = 'isolated database';
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri());
    await Promise.all([User.init(), Token.init()]);
    process.env.JWT_SECRET = crypto.randomBytes(32).toString('hex');
    const app = express(); app.use(express.json());
    app.use('/api/auth', require('../routes/authRoutes'));
    const oldPassword = crypto.randomBytes(24).toString('base64url');
    const newPassword = crypto.randomBytes(24).toString('base64url');
    stage = 'registration and login';
    const registered = await request(app).post('/api/auth/register').send({ name: 'Temporary verification account', email: process.env.EMAIL_TEST_TO, password: oldPassword });
    requireCheck(registered.status === 201);
    const login = await request(app).post('/api/auth/login').send({ email: process.env.EMAIL_TEST_TO, password: oldPassword });
    requireCheck(login.status === 200);
    const oldAuth = `Bearer ${login.body.token}`;
    const method = forgot ? 'sendPasswordResetEmail' : 'sendPasswordChangeEmail';
    const send = email[method];
    let delivered, deliveryFailed;
    const delivery = new Promise((resolve, reject) => { delivered = resolve; deliveryFailed = reject; });
    delivery.catch(() => {});
    email[method] = async (recipient, token) => {
      capturedToken = token;
      try { await send(recipient, token); delivered(); }
      catch (error) { deliveryFailed(new Error("Email verification failed")); throw error; }
    };
    stage = 'registered-email password-change request';
    const response = forgot
      ? await request(app).post('/api/auth/forgot-password').send({ email: process.env.EMAIL_TEST_TO })
      : await request(app).post('/api/auth/request-password-change').set('Authorization', oldAuth);
    requireCheck(response.status === 200);
    await delivery;
    console.log('PASS: Resend accepted the password link email.');
    stage = 'token persistence and URL';
    requireCheck(typeof capturedToken === 'string' && /^[a-f0-9]{64}$/.test(capturedToken));
    const record = await Token.findOne({ userId: registered.body._id });
    requireCheck(record && record.tokenHash === crypto.createHash('sha256').update(capturedToken).digest('hex'));
    const payload = { token: capturedToken, newPassword, confirmPassword: newPassword };
    stage = 'password update';
    requireCheck((await request(app).post('/api/auth/reset-password').send(payload)).status === 200);
    console.log('PASS: password updated through the reset endpoint.');
    stage = 'token reuse and old session rejection';
    requireCheck((await request(app).post('/api/auth/reset-password').send(payload)).status === 400);
    requireCheck((await request(app).get('/api/auth/me').set('Authorization', oldAuth)).status === 401);
    stage = 'old password rejection';
    requireCheck((await request(app).post('/api/auth/login').send({ email: process.env.EMAIL_TEST_TO, password: oldPassword })).status === 401);
    stage = 'new password login';
    const fresh = await request(app).post('/api/auth/login').send({ email: process.env.EMAIL_TEST_TO, password: newPassword });
    requireCheck(fresh.status === 200);
    requireCheck((await request(app).get('/api/auth/me').set('Authorization', `Bearer ${fresh.body.token}`)).status === 200);
    console.log('PASS: old token, JWT and password rejected; new login and session accepted.');
    console.log('Temporary account removed. The emailed verification link has already been consumed.');
  } catch {
    // Stage names are static; never output error objects, request bodies or provider responses.
    console.error(`FAIL: ${stage}. No sensitive details logged.`); process.exitCode = 1;
  } finally {
    capturedToken = undefined;
    await mongoose.disconnect();
    if (mongo) await mongo.stop();
  }
})();

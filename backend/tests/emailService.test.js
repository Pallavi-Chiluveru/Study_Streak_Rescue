const { test, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const nodemailer = require('nodemailer');
const originalCreate = nodemailer.createTransport;
const originalLog = console.log;
const originalError = console.error;
let service, options, messages, creations, rejectVerification, rejectSend, logs;
beforeEach(() => {
  Object.assign(process.env, {
    NODE_ENV: 'development', CLIENT_URL: 'https://study.example.test', EMAIL_HOST: 'smtp.example.test',
    EMAIL_PORT: '587', EMAIL_SECURE: 'false', EMAIL_USER: 'sender@example.test',
    EMAIL_PASS: 'synthetic-test-only', EMAIL_FROM: 'Study Streak <sender@example.test>'
  });
  options = null; messages = []; creations = 0; rejectVerification = false; rejectSend = false; logs = [];
  console.log = value => logs.push(value); console.error = value => logs.push(value);
  nodemailer.createTransport = config => {
    creations++; options = config;
    return {
      verify: async () => { if (rejectVerification) throw new Error('sensitive provider diagnostics'); return true; },
      sendMail: async message => { messages.push(message); if (rejectSend) return { accepted: [] }; return { accepted: [message.to] }; }
    };
  };
  delete require.cache[require.resolve('../services/emailService')];
  service = require('../services/emailService');
});
afterEach(() => {
  nodemailer.createTransport = originalCreate; console.log = originalLog; console.error = originalError;
});
test('STARTTLS configuration and one reusable transporter for verification and sends', async () => {
  assert.equal(await service.initializeEmailService(), true);
  await service.sendTestEmail(); await service.sendTestEmail();
  assert.equal(creations, 1); assert.equal(options.port, 587);
  assert.equal(options.secure, false); assert.equal(options.requireTLS, true);
  assert.deepEqual(logs, ['Email service ready']);
  assert.ok(messages.every(message => message.to === process.env.EMAIL_USER && message.from === process.env.EMAIL_FROM));
});
test('implicit TLS uses secure true on port 465', async () => {
  process.env.EMAIL_PORT = '465'; process.env.EMAIL_SECURE = 'true';
  assert.equal(await service.initializeEmailService(), true);
  assert.equal(options.secure, true); assert.equal(options.requireTLS, false);
});
test('missing settings and inconsistent TLS fail safely without crashing startup', async () => {
  delete process.env.EMAIL_PASS;
  assert.equal(await service.initializeEmailService(), false);
  assert.deepEqual(logs, ['Email service configuration is incomplete.']);
  process.env.EMAIL_PASS = 'synthetic-test-only'; process.env.EMAIL_SECURE = 'true';
  assert.throws(() => service.validateEmailConfiguration(), /configuration is incomplete/);
});
test('provider verification failure only logs a safe readiness message', async () => {
  rejectVerification = true;
  assert.equal(await service.initializeEmailService(), false);
  assert.deepEqual(logs, ['Email service unavailable']);
});
test('reset link uses configured frontend origin and required email branding', async () => {
  const token = 'a'.repeat(64);
  await service.sendPasswordChangeEmail('registered@example.test', token);
  const message = messages[0];
  assert.equal(message.subject, 'Change your Study Streak Rescue password');
  const link = new URL(message.text.match(/https?:\/\/\S+/)[0]);
  assert.ok(link.origin === process.env.CLIENT_URL && link.pathname === '/reset-password' && link.searchParams.get('token') === token);
  assert.match(message.html, /15 minutes/); assert.match(message.html, /Study Streak Rescue/);
  assert.equal(logs.length, 0);
});
test('production rejects HTTP frontend and development test mail', async () => {
  process.env.NODE_ENV = 'production'; process.env.CLIENT_URL = 'http://study.example.test';
  assert.throws(() => service.validateEmailConfiguration(), /configuration is incomplete/);
  await assert.rejects(service.sendTestEmail(), /development-only/);
});
test('SMTP refusal is not reported as a sent message', async () => {
  rejectSend = true;
  await assert.rejects(service.sendPasswordChangeEmail('registered@example.test', 'a'.repeat(64)));
});

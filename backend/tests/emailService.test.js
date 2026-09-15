const { test, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { installResendFetchMock } = require('./resendFetchMock');

const originalLog = console.log;
const originalError = console.error;
let service, messages, rejectSend, logs, restoreFetch;

beforeEach(() => {
  Object.assign(process.env, {
    NODE_ENV: 'development',
    CLIENT_URL: 'https://study.example.test',
    RESEND_API_KEY: 're_synthetic_test_only',
    EMAIL_FROM: 'Study Streak <sender@example.test>',
    EMAIL_TEST_TO: 'recipient@example.test'
  });
  messages = [];
  rejectSend = false;
  logs = [];
  console.log = value => logs.push(value);
  console.error = value => logs.push(value);
  restoreFetch = installResendFetchMock({
    messages,
    shouldFail: () => rejectSend
  });
  delete require.cache[require.resolve('../services/emailService')];
  service = require('../services/emailService');
});

afterEach(() => {
  restoreFetch();
  console.log = originalLog;
  console.error = originalError;
});

test('Resend configuration initializes once and sends through the HTTPS API', async () => {
  assert.equal(await service.initializeEmailService(), true);
  await service.sendTestEmail();
  await service.sendTestEmail();
  assert.deepEqual(logs, ['Email service configured']);
  assert.equal(messages.length, 2);
  assert.ok(messages.every(message =>
    message.to === process.env.EMAIL_TEST_TO &&
    message.from === process.env.EMAIL_FROM
  ));
});

test('normalizes a quoted sender value', async () => {
  process.env.EMAIL_FROM = '"Study Streak <sender@example.test>"';
  await service.sendPasswordChangeEmail('registered@example.test', 'a'.repeat(64));
  assert.equal(messages[0].from, 'Study Streak <sender@example.test>');
});

test('missing Resend settings fail safely without crashing startup', async () => {
  delete process.env.RESEND_API_KEY;
  assert.equal(await service.initializeEmailService(), false);
  assert.deepEqual(logs, ['Email configuration incomplete']);
  assert.throws(() => service.validateEmailConfiguration(), /configuration incomplete/);
});

test('configuration startup does not expose the Resend API key', async () => {
  process.env.NODE_ENV = 'production';
  assert.equal(await service.initializeEmailService(), true);
  assert.deepEqual(logs, ['Email service configured']);
  assert.ok(!logs.join(' ').includes(process.env.RESEND_API_KEY));
});

test('reset link uses configured frontend origin and required email branding', async () => {
  const token = 'a'.repeat(64);
  await service.sendPasswordChangeEmail('registered@example.test', token);
  const message = messages[0];
  assert.equal(message.subject, 'Change your Study Streak Rescue password');
  const link = new URL(message.text.match(/https?:\/\/\S+/)[0]);
  assert.ok(
    link.origin === process.env.CLIENT_URL &&
    link.pathname === '/reset-password' &&
    link.searchParams.get('token') === token
  );
  assert.match(message.html, /15 minutes/);
  assert.match(message.html, /Study Streak Rescue/);
  assert.equal(logs.length, 0);
});

test('production rejects an HTTP frontend and development test mail', async () => {
  process.env.NODE_ENV = 'production';
  process.env.CLIENT_URL = 'http://study.example.test';
  assert.throws(() => service.validateEmailConfiguration(), /configuration incomplete/);
  await assert.rejects(service.sendTestEmail(), /development-only/);
});

test('Resend API refusal is not reported as a sent message', async () => {
  rejectSend = true;
  await assert.rejects(
    service.sendPasswordChangeEmail('registered@example.test', 'a'.repeat(64))
  );
});

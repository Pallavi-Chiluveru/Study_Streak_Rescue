const nodemailer = require('nodemailer');
let transporter;

const configurationError = () => new Error('Email configuration incomplete');
const stripSurroundingQuotes = value => {
  const trimmed = value?.trim() || '';
  const first = trimmed[0];
  return trimmed.length >= 2 && (first === '"' || first === "'") && trimmed.at(-1) === first
    ? trimmed.slice(1, -1).trim()
    : trimmed;
};
const configuredPassword = () => process.env.EMAIL_PASS?.replace(/\s+/g, '') || '';
const configuredFrom = () => stripSurroundingQuotes(process.env.EMAIL_FROM);
const validateEmailConfiguration = () => {
  const required = ['CLIENT_URL', 'EMAIL_HOST', 'EMAIL_PORT', 'EMAIL_SECURE', 'EMAIL_USER', 'EMAIL_PASS', 'EMAIL_FROM'];
  if (required.some(key => !process.env[key]?.trim())) throw configurationError();
  const port = Number(process.env.EMAIL_PORT);
  const secure = process.env.EMAIL_SECURE === 'true';
  if (!['true', 'false'].includes(process.env.EMAIL_SECURE) || !Number.isInteger(port) || port < 1 || port > 65535 ||
      (port === 587 && secure) || (port === 465 && !secure)) throw configurationError();
  let origin;
  try { origin = new URL(process.env.CLIENT_URL); } catch { throw configurationError(); }
  if (origin.username || origin.password || origin.search || origin.hash || origin.pathname !== '/' ||
      !['http:', 'https:'].includes(origin.protocol) ||
      (process.env.NODE_ENV === 'production' && origin.protocol !== 'https:')) throw configurationError();
  return origin;
};

const getTransporter = () => {
  validateEmailConfiguration();
  if (!configuredPassword() || !configuredFrom()) throw configurationError();
  if (!transporter) transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT),
    secure: process.env.EMAIL_SECURE === 'true',
    requireTLS: process.env.EMAIL_SECURE !== 'true',
    auth: { user: process.env.EMAIL_USER.trim(), pass: configuredPassword() },
    connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 15000,
    logger: false, debug: false
  });
  return transporter;
};

const verifyEmailService = async () => {
  try {
    await getTransporter().verify();
    console.log('Email service ready');
    return true;
  } catch (error) {
    const message = String(error?.message || '');
    if (error?.code === 'EAUTH' || error?.responseCode === 535) {
      console.error('Gmail authentication failed. Check EMAIL_USER and App Password.');
    } else if (/Missing credentials for ["']PLAIN["']/i.test(message)) {
      console.error('EMAIL_USER or EMAIL_PASS is missing.');
    } else if (['ETIMEDOUT', 'ECONNECTION', 'ESOCKET'].includes(error?.code)) {
      console.error('SMTP connection failed or timed out.');
    } else {
      console.error('Email service unavailable');
    }
    return false;
  }
};

const initializeEmailService = async () => {
  try { getTransporter(); }
  catch {
    console.error('Email configuration incomplete');
    return false;
  }
  return verifyEmailService();
};

const sendPasswordLinkEmail = async (email, rawToken, reset = false) => {
  const action = reset ? 'Reset' : 'Change';
  const link = new URL('/reset-password', validateEmailConfiguration());
  link.searchParams.set('token', rawToken);
  const url = link.href.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
  const result = await getTransporter().sendMail({
    from: configuredFrom(), to: email, subject: `${action} your Study Streak Rescue password`,
    text: `Study Streak Rescue\n\nWe received a request to ${action.toLowerCase()} your password.\n\n${action} Password: ${link.href}\n\nThis secure link expires in 15 minutes and can only be used once. If you didn't request this change, you can safely ignore this email.`,
    html: `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:32px;color:#0f172a"><p style="color:#ea580c;font-weight:bold">Study Streak Rescue</p><h1 style="font-size:24px">${action} your password</h1><p>We received a request to ${action.toLowerCase()} the password for your account.</p><p style="margin:32px 0"><a href="${url}" style="background:#ea580c;color:white;padding:12px 20px;border-radius:8px;text-decoration:none">${action} Password</a></p><p>This secure link expires in <strong>15 minutes</strong> and can only be used once.</p><p>If you didn't request this change, you can safely ignore this email.</p></div>`
  });
  if (!result.accepted?.length) throw new Error('Email was not accepted');
};

exports.sendPasswordChangeEmail = (email, token) => sendPasswordLinkEmail(email, token);
exports.sendPasswordResetEmail = (email, token) => sendPasswordLinkEmail(email, token, true);

exports.sendTestEmail = async () => {
  if (process.env.NODE_ENV === 'production') throw new Error('Email delivery testing is development-only.');
  const result = await getTransporter().sendMail({
    from: configuredFrom(), to: process.env.EMAIL_USER,
    subject: 'Study Streak Rescue email delivery test',
    text: 'Study Streak Rescue email delivery is configured. This is a development test; no account or password was changed.',
    html: '<h1 style="color:#ea580c">Study Streak Rescue</h1><p>Email delivery is configured.</p><p>This is a development test; no account or password was changed.</p>'
  });
  if (!result.accepted?.length) throw new Error('Email service unavailable');
};

const escapeHtml = value => String(value || '').replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[character]));

const sendStudyAlertEmail = async ({ to, firstName, subject, title, message, metrics = [], actionLabel, actionUrl }) => {
  const safeMetrics = metrics.slice(0, 5).map(metric => ({
    label: String(metric.label || '').slice(0, 80),
    value: String(metric.value || '').slice(0, 120)
  }));
  const metricText = safeMetrics.map(metric => metric.label + ': ' + metric.value).join('\n');
  const metricHtml = safeMetrics.map(metric => '<div style="padding:10px 0;border-bottom:1px solid #e2e8f0"><span style="color:#64748b">' + escapeHtml(metric.label) + '</span><br><strong>' + escapeHtml(metric.value) + '</strong></div>').join('');
  const result = await getTransporter().sendMail({
    from: configuredFrom(), to, subject,
    text: 'Study Streak Rescue\n\nHi ' + (firstName || 'Learner') + ',\n\n' + title + '\n\n' + message + (metricText ? '\n\n' + metricText : '') + '\n\n' + actionLabel + ': ' + actionUrl + '\n\nStudy Streak Rescue',
    html: '<div style="background:#fff7ed;padding:24px 12px"><div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;background:white;border:1px solid #fed7aa;border-radius:16px;padding:28px;color:#0f172a"><p style="color:#ea580c;font-weight:bold">Study Streak Rescue</p><p>Hi ' + escapeHtml(firstName || 'Learner') + ',</p><h1 style="font-size:22px">' + escapeHtml(title) + '</h1><p style="line-height:1.6;color:#475569">' + escapeHtml(message) + '</p>' + metricHtml + '<p style="margin:28px 0"><a href="' + escapeHtml(actionUrl) + '" style="display:inline-block;background:#ea580c;color:white;padding:12px 18px;border-radius:10px;text-decoration:none;font-weight:bold">' + escapeHtml(actionLabel) + '</a></p><p style="font-size:12px;color:#64748b">You can manage study-alert emails in Settings.</p></div></div>'
  });
  if (!result.accepted?.length) throw new Error('Email was not accepted');
};
exports.sendStudyAlertEmail = sendStudyAlertEmail;
exports.validateEmailConfiguration = validateEmailConfiguration;
exports.initializeEmailService = initializeEmailService;
exports.verifyEmailService = verifyEmailService;

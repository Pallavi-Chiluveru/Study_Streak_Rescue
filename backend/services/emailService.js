const { Resend } = require('resend');

let resend;

const configurationError = () => new Error('Email configuration incomplete');
const stripSurroundingQuotes = value => {
  const trimmed = value?.trim() || '';
  const first = trimmed[0];
  return trimmed.length >= 2 && (first === '"' || first === "'") && trimmed.at(-1) === first
    ? trimmed.slice(1, -1).trim()
    : trimmed;
};

const configuredFrom = () => stripSurroundingQuotes(process.env.EMAIL_FROM);
const validateEmailConfiguration = () => {
  const required = ['CLIENT_URL', 'RESEND_API_KEY', 'EMAIL_FROM'];
  if (required.some(key => !process.env[key]?.trim())) throw configurationError();

  let origin;
  try { origin = new URL(process.env.CLIENT_URL); } catch { throw configurationError(); }
  if (origin.username || origin.password || origin.search || origin.hash || origin.pathname !== '/' ||
      !['http:', 'https:'].includes(origin.protocol) ||
      (process.env.NODE_ENV === 'production' && origin.protocol !== 'https:')) throw configurationError();
  return origin;
};

const getClient = () => {
  validateEmailConfiguration();
  if (!configuredFrom()) throw configurationError();
  if (!resend) resend = new Resend(process.env.RESEND_API_KEY.trim());
  return resend;
};

const deliverEmail = async message => {
  const { data, error } = await getClient().emails.send(message);
  if (error || !data?.id) throw error || new Error('Email service unavailable');
  return data;
};

const verifyEmailService = async () => {
  try {
    getClient();
    console.log('Email service configured');
    return true;
  } catch {
    console.error('Email configuration incomplete');
    return false;
  }
};

const initializeEmailService = async () => verifyEmailService();

const sendPasswordLinkEmail = async (email, rawToken, reset = false) => {
  const action = reset ? 'Reset' : 'Change';
  const link = new URL('/reset-password', validateEmailConfiguration());
  link.searchParams.set('token', rawToken);
  const url = link.href.replace(/&/g, '&amp;').replace(/"/g, '&quot;');

  await deliverEmail({
    from: configuredFrom(),
    to: email,
    subject: `${action} your Study Streak Rescue password`,
    text: `Study Streak Rescue\n\nWe received a request to ${action.toLowerCase()} your password.\n\n${action} Password: ${link.href}\n\nThis secure link expires in 15 minutes and can only be used once. If you didn't request this change, you can safely ignore this email.`,
    html: `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:32px;color:#0f172a"><p style="color:#ea580c;font-weight:bold">Study Streak Rescue</p><h1 style="font-size:24px">${action} your password</h1><p>We received a request to ${action.toLowerCase()} the password for your account.</p><p style="margin:32px 0"><a href="${url}" style="background:#ea580c;color:white;padding:12px 20px;border-radius:8px;text-decoration:none">${action} Password</a></p><p>This secure link expires in <strong>15 minutes</strong> and can only be used once.</p><p>If you didn't request this change, you can safely ignore this email.</p></div>`
  });
};

exports.sendPasswordChangeEmail = (email, token) => sendPasswordLinkEmail(email, token);
exports.sendPasswordResetEmail = (email, token) => sendPasswordLinkEmail(email, token, true);

exports.sendTestEmail = async () => {
  if (process.env.NODE_ENV === 'production') throw new Error('Email delivery testing is development-only.');
  await deliverEmail({
    from: configuredFrom(),
    to: process.env.EMAIL_TEST_TO?.trim() || configuredFrom(),
    subject: 'Study Streak Rescue email delivery test',
    text: 'Study Streak Rescue email delivery is configured. This is a development test; no account or password was changed.',
    html: '<h1 style="color:#ea580c">Study Streak Rescue</h1><p>Email delivery is configured.</p><p>This is a development test; no account or password was changed.</p>'
  });
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

  await deliverEmail({
    from: configuredFrom(), to, subject,
    text: 'Study Streak Rescue\n\nHi ' + (firstName || 'Learner') + ',\n\n' + title + '\n\n' + message + (metricText ? '\n\n' + metricText : '') + '\n\n' + actionLabel + ': ' + actionUrl + '\n\nStudy Streak Rescue',
    html: '<div style="background:#fff7ed;padding:24px 12px"><div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;background:white;border:1px solid #fed7aa;border-radius:16px;padding:28px;color:#0f172a"><p style="color:#ea580c;font-weight:bold">Study Streak Rescue</p><p>Hi ' + escapeHtml(firstName || 'Learner') + ',</p><h1 style="font-size:22px">' + escapeHtml(title) + '</h1><p style="line-height:1.6;color:#475569">' + escapeHtml(message) + '</p>' + metricHtml + '<p style="margin:28px 0"><a href="' + escapeHtml(actionUrl) + '" style="display:inline-block;background:#ea580c;color:white;padding:12px 18px;border-radius:10px;text-decoration:none;font-weight:bold">' + escapeHtml(actionLabel) + '</a></p><p style="font-size:12px;color:#64748b">You can manage study-alert emails in Settings.</p></div></div>'
  });
};

exports.sendStudyAlertEmail = sendStudyAlertEmail;
exports.validateEmailConfiguration = validateEmailConfiguration;
exports.initializeEmailService = initializeEmailService;
exports.verifyEmailService = verifyEmailService;

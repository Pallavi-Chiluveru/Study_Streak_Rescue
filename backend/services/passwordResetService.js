const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const PasswordResetToken = require('../models/PasswordResetToken');
const emailService = require('./emailService');
const fail = (message, code, status = 400) => Object.assign(new Error(message), { code, status });
const invalid = () => fail('This password-change link is invalid or has already been used.', 'INVALID_TOKEN');
const hashToken = token => crypto.createHash('sha256').update(token).digest('hex');
const validatePassword = (password, confirmation) => {
  if (typeof password !== 'string' || password.length < 8 || Buffer.byteLength(password, 'utf8') > 72)
    throw fail('Use at least 8 characters and no more than 72 UTF-8 bytes.', 'PASSWORD_POLICY');
  if (password !== confirmation) throw fail('Passwords do not match.', 'PASSWORD_MISMATCH');
};
const issueResetLink = async (user, sendEmail) => {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(rawToken);
  // One unique slot per user atomically replaces previous links across instances.
  await PasswordResetToken.findOneAndUpdate({ userId: user._id }, { $set: {
    tokenHash, expiresAt: new Date(Date.now() + 15 * 60 * 1000), usedAt: null,
    passwordChangedAt: user.passwordChangedAt || null, createdAt: new Date()
  } }, { upsert: true, runValidators: true });
  try { await sendEmail(user.email, rawToken); }
  catch {
    await PasswordResetToken.deleteOne({ userId: user._id, tokenHash });
    throw fail('Unable to send password-change email. Please try again.', 'EMAIL_FAILED', 503);
  }
};
exports.requestChange = async userId => {
  const user = await User.findById(userId);
  if (!user) throw fail('Not authorized, user not found.', 'UNAUTHORIZED', 401);
  await issueResetLink(user, emailService.sendPasswordChangeEmail);
};
exports.requestForgotPassword = async email => {
  const user = await User.findOne({ email });
  if (user) await issueResetLink(user, emailService.sendPasswordResetEmail);
};
exports.resetPassword = async ({ token, newPassword, confirmPassword } = {}) => {
  if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) throw invalid();
  validatePassword(newPassword, confirmPassword);
  const tokenHash = hashToken(token);
  const record = await PasswordResetToken.findOne({ tokenHash });
  if (!record || record.usedAt) throw invalid();
  if (record.expiresAt <= new Date()) throw fail('This password-change link has expired.', 'EXPIRED_TOKEN');
  const password = await bcrypt.hash(newPassword, 10);
  const now = new Date();
  // Atomic claim prevents simultaneous use, with expiry checked again after hashing.
  const claimed = await PasswordResetToken.findOneAndUpdate(
    { tokenHash, usedAt: null, expiresAt: { $gt: now } }, { $set: { usedAt: now } }, { returnDocument: 'after' }
  );
  if (!claimed) throw invalid();
  const changedAt = new Date(Math.max(Date.now(), (claimed.passwordChangedAt?.getTime() || 0) + 1));
  // Compare-and-set rejects other links issued during a concurrent password change.
  const result = await User.updateOne(
    { _id: claimed.userId, passwordChangedAt: claimed.passwordChangedAt || null },
    { $set: { password, passwordChangedAt: changedAt } }
  );
  if (!result.modifiedCount) throw invalid();
  // Password timestamp invalidates other links even if cleanup is delayed.
  try {
    await PasswordResetToken.deleteMany({ userId: claimed.userId, passwordChangedAt: claimed.passwordChangedAt || null });
  } catch {
    // The claim and user timestamp already revoke these links. TTL will clean up later.
    console.warn('password_reset_cleanup_deferred');
  }
};
exports.validatePassword = validatePassword;

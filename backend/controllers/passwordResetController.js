const service = require('../services/passwordResetService');
exports.forgotPassword = async (req, res) => {
  res.set('Cache-Control', 'no-store');
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ success: false, message: 'Please enter a valid email address.' });
  }
  // Respond before lookup and email delivery: account existence cannot change response timing.
  // Delivery runs in this long-running Express process, not a serverless handler.
  res.json({ success: true, message: 'If an account exists for this email, a password reset link has been sent.' });
  try { await service.requestForgotPassword(email); }
  catch { console.warn('forgot_password_delivery_failed'); }
};
const handleError = (error, res) => res.status(error.status || 503).json({
  success: false, code: error.code || 'TEMPORARILY_UNAVAILABLE',
  message: error.status ? error.message : 'Unable to process this request. Please try again.'
});
exports.requestPasswordChange = async (req, res) => {
  res.set('Cache-Control', 'no-store');
  try {
    await service.requestChange(req.user._id);
    res.json({ success: true, message: 'A secure password-change link has been sent to your registered email.' });
  } catch (error) { handleError(error, res); }
};
exports.resetPassword = async (req, res) => {
  res.set('Cache-Control', 'no-store');
  try {
    await service.resetPassword(req.body || {});
    res.json({ success: true, message: 'Password changed successfully. Please sign in again.' });
  } catch (error) { handleError(error, res); }
};

const express = require('express');
const router = express.Router();
const { registerUser, loginUser, getMe, getSettings, updateSettings } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

const { rateLimit } = require('express-rate-limit');
const { requestPasswordChange, resetPassword, forgotPassword } = require('../controllers/passwordResetController');
const limitOptions = {
  windowMs: 60 * 60 * 1000, limit: 5, standardHeaders: 'draft-8', legacyHeaders: false,
  message: { message: 'Please wait before requesting another link.' }
};
const requestIpLimit = rateLimit(limitOptions);
const forgotIpLimit = rateLimit(limitOptions);
const forgotEmailLimit = rateLimit({ ...limitOptions, keyGenerator: req =>
  require('crypto').createHash('sha256').update(typeof req.body?.email === 'string'
    ? req.body.email.trim().toLowerCase() : '').digest('hex') });
router.post('/forgot-password', forgotIpLimit, forgotEmailLimit, forgotPassword);
const requestUserLimit = rateLimit({ ...limitOptions, keyGenerator: req => String(req.user._id) });
const resetLimit = rateLimit({ ...limitOptions, windowMs: 15 * 60 * 1000, limit: 20,
  message: { message: 'Too many attempts. Please try again later.' } });
router.post('/request-password-change', requestIpLimit, protect, requestUserLimit, requestPasswordChange);
router.post('/reset-password', resetLimit, resetPassword);

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/me', protect, getMe);
router.get('/settings', protect, getSettings);
router.patch('/settings', protect, updateSettings);

module.exports = router;

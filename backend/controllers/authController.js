const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

const generateToken = (user) => {
  return jwt.sign({ id: user._id, passwordChangedAt: user.passwordChangedAt?.getTime() || 0 }, process.env.JWT_SECRET, {
    expiresIn: '30d'
  });
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    if (typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ message: 'Full name is required.' });
    }
    if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return res.status(400).json({ message: 'Enter a valid email address.' });
    }
    if (typeof password !== 'string' || password.length < 8 || Buffer.byteLength(password, 'utf8') > 72) {
      return res.status(400).json({ message: 'Password must be between 8 and 72 bytes.' });
    }
    const normalizedEmail = email.trim().toLowerCase();
    const userExists = await User.findOne({ email: normalizedEmail });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword
    });

    if (user) {
      res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        streak: user.streak,
        xp: user.xp,
        totalFocusMinutes: user.totalFocusMinutes,
        goalOnboarding: user.goalOnboarding,
        planningProfile: user.planningProfile,
        token: generateToken(user)
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (user && (await bcrypt.compare(password, user.password))) {
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        streak: user.streak,
        xp: user.xp,
        totalFocusMinutes: user.totalFocusMinutes,
        goalOnboarding: user.goalOnboarding,
        planningProfile: user.planningProfile,
        token: generateToken(user)
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    res.json(user);
  } catch (error) {
    next(error);
  }
};

const getSettings = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('preferences timezone');
    const preferences = user.preferences?.toObject ? user.preferences.toObject() : (user.preferences || {});
    res.json({ ...preferences, timezone: user.timezone || 'UTC' });
  } catch (error) {
    next(error);
  }
};
const updateSettings = async (req, res, next) => {
  try {
    const allowed = [
      'adaptiveTimeEstimation', 'focusSessionMinutes', 'defaultDailyMinutes', 'preferredStudyTime', 'defaultDifficulty',
      'autoStartFocusTimer', 'autoDetectMissed', 'rescueSuggestions', 'rescueThreshold',
      'preserveLowPriority', 'notifications', 'planning', 'gamification', 'timezone'
    ];
    if (req.body.adaptiveTimeEstimation !== undefined && typeof req.body.adaptiveTimeEstimation !== 'boolean') {
      return res.status(400).json({ message: 'Adaptive time estimation must be true or false.' });
    }
    const updates = Object.fromEntries(Object.entries(req.body).filter(([key]) => allowed.includes(key)));
    if (updates.timezone !== undefined) {
      if (typeof updates.timezone !== 'string' || updates.timezone.length > 80) return res.status(400).json({ message: 'Invalid timezone.' });
      try { new Intl.DateTimeFormat('en-US', { timeZone: updates.timezone }).format(); }
      catch { return res.status(400).json({ message: 'Invalid timezone.' }); }
    }
    const user = await User.findById(req.user._id);
    if (!user.preferences) user.preferences = {};
    if (updates.timezone) user.timezone = updates.timezone;
    allowed.forEach((key) => {
      if (updates[key] !== undefined && key !== 'timezone') {
        if (['notifications', 'planning', 'gamification'].includes(key)) {
          const currentGroup = user.preferences?.[key];
          const currentValues = currentGroup?.toObject ? currentGroup.toObject() : (currentGroup || {});
          user.preferences[key] = { ...currentValues, ...updates[key] };
        } else {
          user.preferences[key] = updates[key];
        }
      }
    });
    await user.save();
    const savedPreferences = user.preferences?.toObject ? user.preferences.toObject() : user.preferences;
    res.json({ ...savedPreferences, timezone: user.timezone || 'UTC' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  registerUser,
  loginUser,
  getMe,
  getSettings,
  updateSettings
};

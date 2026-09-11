const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'super_secret_lightning_key_2026', {
    expiresIn: '30d'
  });
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Please provide all required fields' });
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      name,
      email,
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
        token: generateToken(user._id)
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
        token: generateToken(user._id)
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
    const user = await User.findById(req.user._id).select('preferences');
    res.json(user.preferences || {});
  } catch (error) {
    next(error);
  }
};

const updateSettings = async (req, res, next) => {
  try {
    const allowed = [
      'focusSessionMinutes', 'defaultDailyMinutes', 'preferredStudyTime', 'defaultDifficulty',
      'autoStartFocusTimer', 'autoDetectMissed', 'rescueSuggestions', 'rescueThreshold',
      'preserveLowPriority', 'notifications', 'planning', 'gamification'
    ];
    const updates = Object.fromEntries(Object.entries(req.body).filter(([key]) => allowed.includes(key)));
    const user = await User.findById(req.user._id);
    if (!user.preferences) user.preferences = {};
    allowed.forEach((key) => {
      if (updates[key] !== undefined) {
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
    res.json(user.preferences);
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

const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide a name'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Please provide an email'],
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: [true, 'Please provide a password']
  },
  role: {
    type: String,
    enum: ['student', 'admin'],
    default: 'student'
  },
  streak: {
    type: Number,
    default: 0
  },
  xp: {
    type: Number,
    default: 0
  },
  totalFocusMinutes: {
    type: Number,
    default: 0
  },
  lastActiveDate: {
    type: Date,
    default: null
  },
  preferences: {
    focusSessionMinutes: { type: Number, default: 45 },
    defaultDailyMinutes: { type: Number, default: 120 },
    preferredStudyTime: { type: String, default: 'evening' },
    defaultDifficulty: { type: String, default: 'medium' },
    autoStartFocusTimer: { type: Boolean, default: false },
    autoDetectMissed: { type: Boolean, default: true },
    rescueSuggestions: { type: Boolean, default: true },
    rescueThreshold: { type: Number, default: 60 },
    preserveLowPriority: { type: Boolean, default: true },
    notifications: {
      dailyReminder: { type: Boolean, default: true },
      missedTasks: { type: Boolean, default: true },
      planHealth: { type: Boolean, default: true },
      streak: { type: Boolean, default: true },
      achievements: { type: Boolean, default: true },
      rescueComplete: { type: Boolean, default: true }
    },
    planning: {
      sessionLengthMinutes: { type: Number, default: 45 },
      dailyAvailabilityMinutes: { type: Number, default: 120 },
      difficulty: { type: String, default: 'medium' },
      priority: { type: String, default: 'medium' },
      allowBusyDays: { type: Boolean, default: true },
      unavailableDays: { type: [String], default: [] }
    },
    gamification: {
      showXP: { type: Boolean, default: true },
      showStreak: { type: Boolean, default: true },
      achievementAnimations: { type: Boolean, default: true },
      completionAnimations: { type: Boolean, default: true }
    }
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('User', userSchema);

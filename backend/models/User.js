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
  passwordChangedAt: { type: Date, default: null },
  timezone: { type: String, default: 'UTC', maxlength: 80 },
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
  longestStreak: {
    type: Number,
    default: 0
  },
  goalOnboarding: {
    status: { type: String, enum: ['not_started', 'in_progress', 'completed', 'skipped'], default: 'not_started' },
    completedAt: { type: Date, default: null }, dismissed: { type: Boolean, default: false },
    step: { type: Number, default: 0 }, draft: { type: mongoose.Schema.Types.Mixed, default: {} }
  },
  planningProfile: {
    enabled: { type: Boolean, default: false },
    rawDirectionText: { type: String, default: '' },
    mainAim: { type: String, default: '' },
    weeklyAvailability: { type: [Number], default: () => [120, 120, 120, 120, 120, 180, 180] },
    maximumDailyMinutes: { type: Number, default: 180 }, preferredSessionMinutes: { type: Number, default: 45 },
    preferredStudyPeriod: { type: String, default: 'evening' }, restDays: [Number],
    utilizationPreference: { type: String, default: 'balanced' },
    fixedBlocks: [{ daysOfWeek: [Number], startMinute: Number, endMinute: Number, label: String }],
    applyingPreviewId: { type: mongoose.Schema.Types.ObjectId, default: null }, applyingSince: Date,
    scheduleRevision: { type: Number, default: 0 }, lastAppliedAt: Date
  },
  learningPace: {
    globalMultiplier: { type: Number, default: 1 },
    smoothedMultiplier: { type: Number, default: 1 },
    sampleCount: { type: Number, default: 0 },
    averageEstimateAccuracy: { type: Number, default: 100 },
    accuracyTotal: { type: Number, default: 0 },
    estimatedMinutes: { type: Number, default: 0 },
    actualMinutes: { type: Number, default: 0 },
    lastUpdatedAt: Date
  },
  gamification: {
    achievements: [{
      achievementId: { type: String, required: true },
      unlockedAt: { type: Date, default: Date.now },
      rewardGranted: { type: Boolean, default: true }
    }],
    dailyChallenges: [{
      challengeId: String,
      dateKey: String,
      current: { type: Number, default: 0 },
      target: Number,
      completedAt: Date,
      rewardGranted: { type: Boolean, default: false }
    }],
    weeklyChallenges: [{
      challengeId: String,
      weekKey: String,
      current: { type: Number, default: 0 },
      target: Number,
      completedAt: Date,
      rewardGranted: { type: Boolean, default: false }
    }],
    lastLevel: { type: Number, default: 1 }
  },
  lastActiveDate: {
    type: Date,
    default: null
  },
  preferences: {
    adaptiveTimeEstimation: { type: Boolean, default: true },
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
      rescueComplete: { type: Boolean, default: true },
      inApp: {
        taskReminders: { type: Boolean, default: true },
        deadlineAlerts: { type: Boolean, default: true },
        planHealthAlerts: { type: Boolean, default: true },
        rescueSuggestions: { type: Boolean, default: true },
        achievements: { type: Boolean, default: true },
        streaks: { type: Boolean, default: true }
      },
      email: {
        enabled: { type: Boolean, default: true },
        importantDeadlines: { type: Boolean, default: true },
        missedWorkAlerts: { type: Boolean, default: true },
        planAtRisk: { type: Boolean, default: true },
        ordinaryTaskReminders: { type: Boolean, default: false },
        weeklySummary: { type: Boolean, default: true },
        dailySummary: { type: Boolean, default: false }
      }
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

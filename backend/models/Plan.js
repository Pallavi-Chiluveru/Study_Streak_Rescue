const mongoose = require('mongoose');

const planSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  goalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Goal', default: null, index: true },
  title: {
    type: String,
    required: [true, 'Plan title is required'],
    trim: true
  },
  category: {
    type: String,
    default: 'General Learning'
  },
  description: {
    type: String,
    default: ''
  },
  topics: [{
    type: String
  }],
  startDate: {
    type: Date,
    default: Date.now
  },
  deadline: {
    type: Date,
    required: [true, 'Deadline is required']
  },
  availableMinutesPerDay: {
    type: Number,
    required: [true, 'Available time per day is required']
  },
  sessionLength: {
    type: Number,
    default: 45 // 30, 45, or 60
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'medium'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  estimatedTotalMinutes: {
    type: Number,
    default: 0
  },
  feasible: {
    type: Boolean,
    default: true
  },
  healthScore: {
    type: Number,
    default: 100,
    min: 0,
    max: 100
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'at_risk', 'rescue_needed'],
    default: 'active'
  },
  rescueCount: {
    type: Number,
    default: 0
  },
  healthHistory: [{
    score: Number,
    recordedAt: { type: Date, default: Date.now }
  }],
  notificationState: {
    critical: { type: Boolean, default: false }
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Plan', planSchema);

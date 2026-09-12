const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  planId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Plan',
    required: true
  },
  portfolioWriteId: mongoose.Schema.Types.ObjectId,
  goalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Goal', default: null, index: true },
  scheduleState: { type: String, enum: ['scheduled', 'held'], default: 'scheduled' },
  scheduledStartMinute: Number, scheduledEndMinute: Number,
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  scheduledDate: {
    type: Date,
    required: true
  },
  estimatedMinutes: {
    type: Number,
    required: true,
    default: 45
  },
  baseEstimatedMinutes: { type: Number, min: 1 },
  adaptiveEstimatedMinutes: { type: Number, min: 1 },
  estimationSource: { type: String, enum: ['groq', 'adaptive'], default: 'groq' },
  focusAccumulatedMs: { type: Number, default: 0, min: 0 },
  focusHeartbeatAt: { type: Date, default: null },
  focusRunningSince: { type: Date, default: null },
  focusRecorded: { type: Boolean, default: false },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['pending', 'active', 'completed', 'missed', 'rescheduled'],
    default: 'pending'
  },
  wasRescheduled: {
    type: Boolean,
    default: false
  },
  completedAt: {
    type: Date,
    default: null
  },
  startedAt: {
    type: Date,
    default: null
  },
  actualFocusMinutes: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

taskSchema.pre('validate', async function enforcePlanDateBounds() {
  if ((!this.isNew && !this.isModified('scheduledDate')) || this.status === 'completed') return;
  const plan = await mongoose.model('Plan').findById(this.planId).select('startDate deadline');
  if (!plan) return;
  this.scheduledDate = require('../utils/dateUtils').assertDateWithinRange(this.scheduledDate, plan.startDate, plan.deadline);
});

module.exports = mongoose.model('Task', taskSchema);

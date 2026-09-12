const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, required: true, maxlength: 160 }, category: { type: String, required: true, maxlength: 80 },
  description: { type: String, default: '', maxlength: 2000 }, motivation: { type: String, default: '', maxlength: 1000 },
  mainOutcome: { type: String, default: '', maxlength: 1000 }, notes: { type: String, default: '', maxlength: 2000 },
  currentLevel: { type: String, default: '', maxlength: 200 }, currentProgress: { type: Number, default: 0, min: 0, max: 100 },
  horizon: { type: String, enum: ['short', 'medium', 'long'], default: 'medium' },
  priority: { type: String, enum: ['high', 'medium', 'low'], default: 'medium' },
  importance: { type: String, enum: ['essential', 'important', 'flexible'], default: 'important' },
  startDate: Date, deadline: Date,
  cadence: { type: { type: String, enum: ['ai_recommended', 'daily', 'weekdays', 'alternate_days', 'times_per_week', 'weekends', 'specific_days', 'flexible'], default: 'ai_recommended' }, timesPerWeek: { type: Number, default: 3 }, daysOfWeek: [Number] },
  minimumWeeklyMinutes: { type: Number, default: 0 }, weeklyMinutes: { type: Number, default: 135 },
  totalEstimatedMinutes: { type: Number, default: null },
  status: { type: String, enum: ['active', 'paused', 'completed', 'archived'], default: 'active' },
  milestones: [{ title: String, targetDate: Date, estimatedWork: Number, status: { type: String, enum: ['pending', 'completed'], default: 'pending' } }],
  aiAnalysis: mongoose.Schema.Types.Mixed, completedAt: { type: Date, default: null }
}, { timestamps: true });
module.exports = mongoose.model('Goal', schema);

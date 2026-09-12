const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: { type: String, required: true, index: true },
  severity: { type: String, enum: ['low', 'medium', 'high', 'critical'], required: true },
  channelContext: { type: String, default: 'in_app' },
  title: { type: String, required: true, maxlength: 180 },
  message: { type: String, required: true, maxlength: 1000 },
  actionLabel: { type: String, maxlength: 80 },
  actionUrl: { type: String, maxlength: 500 },
  actionMethod: { type: String, enum: ['navigate', 'start_early'], default: 'navigate' },
  relatedTaskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', default: null },
  relatedPlanId: { type: mongoose.Schema.Types.ObjectId, ref: 'Plan', default: null },
  relatedGoalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Goal', default: null },
  readAt: { type: Date, default: null },
  impactEligible: { type: Boolean, default: false },
  impactClaimedAt: { type: Date, default: null },
  dedupeKey: { type: String, required: true },
  expiresAt: { type: Date, default: null }
}, { timestamps: true });

notificationSchema.index({ userId: 1, dedupeKey: 1 }, { unique: true });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0, sparse: true });

module.exports = mongoose.model('Notification', notificationSchema);
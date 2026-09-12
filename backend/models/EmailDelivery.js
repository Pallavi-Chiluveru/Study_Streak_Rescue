const mongoose = require('mongoose');

const emailDeliverySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: { type: String, required: true },
  dedupeKey: { type: String, required: true },
  relatedEntityId: { type: mongoose.Schema.Types.ObjectId, default: null },
  status: { type: String, enum: ['pending', 'sent', 'failed'], default: 'pending' },
  sentAt: { type: Date, default: null },
  failedAt: { type: Date, default: null }
}, { timestamps: true });

emailDeliverySchema.index({ userId: 1, dedupeKey: 1 }, { unique: true });

module.exports = mongoose.model('EmailDelivery', emailDeliverySchema);
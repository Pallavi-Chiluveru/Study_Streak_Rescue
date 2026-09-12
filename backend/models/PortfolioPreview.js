const mongoose = require('mongoose');
const schema = new mongoose.Schema({
 userId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true }, fingerprint: String,
 journal: mongoose.Schema.Types.Mixed, data: mongoose.Schema.Types.Mixed, appliedAt: Date, expiresAt: { type: Date, default: () => new Date(Date.now() + 3600000) }
}, { timestamps: true });
schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
module.exports = mongoose.model('PortfolioPreview', schema);

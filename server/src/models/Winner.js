import mongoose from 'mongoose';

const WinnerSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  eventId: { type: String, required: true },
  entryId: { type: String, required: true },
  participantId: String,
  prizeCategoryId: String,
  prizeId: String,
  operator: String,
  operatorId: String,
  rngFingerprint: String,
  ruleSnapshot: mongoose.Schema.Types.Mixed,
  status: { type: String, default: 'CONFIRMED' },
  voidReason: String,
  voidedAt: Date
}, { timestamps: { createdAt: true, updatedAt: false }, versionKey: false });

WinnerSchema.index({ eventId: 1 });
WinnerSchema.index({ entryId: 1 });
WinnerSchema.index({ participantId: 1 });
WinnerSchema.index({ eventId: 1, prizeCategoryId: 1 });

export default mongoose.models.Winner || mongoose.model('Winner', WinnerSchema);

import mongoose from 'mongoose';
const AuditLogSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  eventId: String,
  action: String,
  operator: String,
  userId: String,
  details: mongoose.Schema.Types.Mixed
}, { timestamps: { createdAt: true, updatedAt: false }, versionKey: false });
AuditLogSchema.index({ eventId: 1 });
export default mongoose.models.AuditLog || mongoose.model('AuditLog', AuditLogSchema);

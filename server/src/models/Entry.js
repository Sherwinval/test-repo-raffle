import mongoose from 'mongoose';

const EntrySchema = new mongoose.Schema({
  _id: { type: String, required: true },
  eventId: { type: String, required: true },
  employeeId: String,
  fullName: String,
  department: String,
  email: String,
  entryCode: { type: String, required: true },
  uploadBatchId: String,
  participantId: String
}, { timestamps: { createdAt: true, updatedAt: false }, versionKey: false });

EntrySchema.index({ eventId: 1 });
EntrySchema.index({ uploadBatchId: 1 });
EntrySchema.index({ participantId: 1 });
EntrySchema.index({ eventId: 1, entryCode: 1 }, { unique: true });
EntrySchema.index({ eventId: 1, employeeId: 1 });

export default mongoose.models.Entry || mongoose.model('Entry', EntrySchema);

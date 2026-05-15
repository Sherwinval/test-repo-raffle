import mongoose from 'mongoose';
const MailJobSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  status: String,
  scheduledAt: Date
}, { strict: false, timestamps: true, versionKey: false });
MailJobSchema.index({ status: 1, scheduledAt: 1 });
export default mongoose.models.MailJob || mongoose.model('MailJob', MailJobSchema);

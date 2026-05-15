import mongoose from 'mongoose';
const EmailTemplateSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  key: { type: String, index: true },
  subject: String,
  body: String,
  variables: [String],
  isActive: Boolean
}, { strict: false, timestamps: true, versionKey: false });
export default mongoose.models.EmailTemplate || mongoose.model('EmailTemplate', EmailTemplateSchema);

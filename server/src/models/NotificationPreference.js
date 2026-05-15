import mongoose from 'mongoose';
const NotificationPreferenceSchema = new mongoose.Schema({ _id: { type: String, required: true }, userId: { type: String, index: true } }, { strict: false, timestamps: true, versionKey: false });
export default mongoose.models.NotificationPreference || mongoose.model('NotificationPreference', NotificationPreferenceSchema);

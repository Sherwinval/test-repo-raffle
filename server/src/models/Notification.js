import mongoose from 'mongoose';
const NotificationSchema = new mongoose.Schema({ _id: { type: String, required: true }, userId: String, readAt: Date }, { strict: false, timestamps: true, versionKey: false });
NotificationSchema.index({ userId: 1, readAt: 1 });
export default mongoose.models.Notification || mongoose.model('Notification', NotificationSchema);

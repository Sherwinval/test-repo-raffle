import mongoose from 'mongoose';
const SystemSettingSchema = new mongoose.Schema({ _id: { type: String, required: true }, key: { type: String, unique: true }, value: mongoose.Schema.Types.Mixed }, { timestamps: true, versionKey: false });
export default mongoose.models.SystemSetting || mongoose.model('SystemSetting', SystemSettingSchema);

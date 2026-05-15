import mongoose from 'mongoose';
const BrandAssetSchema = new mongoose.Schema({ _id: { type: String, required: true } }, { strict: false, timestamps: true, versionKey: false });
export default mongoose.models.BrandAsset || mongoose.model('BrandAsset', BrandAssetSchema);

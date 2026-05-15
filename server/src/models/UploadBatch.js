import mongoose from 'mongoose';

const UploadBatchSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  eventId: { type: String, required: true },
  status: String,
  totalRows: Number,
  insertedRows: Number,
  skippedRows: Number,
  errors: { type: [mongoose.Schema.Types.Mixed], default: [] },
  fileName: String,
  lastProcessedRow: { type: Number, default: 0 }
}, { timestamps: true, versionKey: false });

UploadBatchSchema.index({ eventId: 1 });
UploadBatchSchema.index({ eventId: 1, status: 1 });

export default mongoose.models.UploadBatch || mongoose.model('UploadBatch', UploadBatchSchema);

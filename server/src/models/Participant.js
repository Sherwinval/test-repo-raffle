import mongoose from 'mongoose';

const ParticipantSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  employeeId: String,
  email: { type: String, index: true },
  role: String,
  site: String,
  firstName: String,
  lastName: String,
  rawData: mongoose.Schema.Types.Mixed,
  status: { type: String, default: 'ACTIVE' },
  tags: { type: [String], default: [] }
}, { timestamps: true, versionKey: false });

ParticipantSchema.index({ employeeId: 1 });

export default mongoose.models.Participant || mongoose.model('Participant', ParticipantSchema);

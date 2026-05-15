import mongoose from 'mongoose';

const PrizeSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  label: String,
  description: String,
  createdAt: Date
}, { _id: false });

const PrizeCategorySchema = new mongoose.Schema({
  _id: { type: String, required: true },
  name: String,
  tier: String,
  prizeCount: Number,
  displayOrder: Number,
  prizes: [PrizeSchema],
  createdAt: Date,
  updatedAt: Date
}, { _id: false });

const DrawConstraintSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  attribute: String,
  maxPerValue: Number,
  type: String,
  categoryScope: String
}, { _id: false });

const WeightRuleSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  attribute: String,
  operator: String,
  value: String,
  multiplier: Number
}, { _id: false });

const DrawRuleSetSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  crossCategoryExclusion: { type: Boolean, default: false },
  weightCapMultiplier: { type: Number, default: 10 },
  excludeInactive: { type: Boolean, default: true },
  constraints: [DrawConstraintSchema],
  weightRules: [WeightRuleSchema],
  updatedAt: Date
}, { _id: false });

const EventSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  name: { type: String, required: true },
  status: { type: String, default: 'Draft' },
  prizeCategories: [PrizeCategorySchema],
  drawRuleSet: DrawRuleSetSchema
}, { timestamps: true, versionKey: false });

export default mongoose.models.Event || mongoose.model('Event', EventSchema);

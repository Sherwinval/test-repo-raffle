import { randomUUID } from 'crypto';
import SystemSetting from '../models/SystemSetting.js';

const SYSTEM_KEY = 'system';
const DEFAULTS = { brandName: 'RAFDOM', accentColor: '#ff8c00', logoUrl: '', retentionDays: 0 };
const maskOutput = (value) => ({ ...DEFAULTS, ...(value || {}) });

export async function loadSystemSettings() {
  const row = await SystemSetting.findOne({ key: SYSTEM_KEY }).lean();
  return maskOutput(row?.value || {});
}

export async function saveSystemSettingsService({ updates, updatedBy = null }) {
  const existing = await SystemSetting.findOne({ key: SYSTEM_KEY }).lean();
  const merged = { ...DEFAULTS, ...(existing?.value || {}) };
  for (const key of ['brandName', 'accentColor', 'logoUrl', 'retentionDays']) if (key in (updates || {})) merged[key] = updates[key];
  await SystemSetting.findOneAndUpdate({ key: SYSTEM_KEY }, { $set: { value: merged, updatedBy }, $setOnInsert: { _id: randomUUID(), key: SYSTEM_KEY } }, { upsert: true, new: true });
  return maskOutput(merged);
}

import prisma from '../prisma.js';

const SYSTEM_KEY = 'system';

const DEFAULTS = {
  brandName: 'RAFDOM',
  accentColor: '#ff8c00',
  logoUrl: '',
  retentionDays: 0
};

function maskOutput(value) {
  const out = { ...DEFAULTS, ...value };
  return out;
}

export async function loadSystemSettings() {
  const row = await prisma.systemSetting.findUnique({ where: { key: SYSTEM_KEY } });
  return maskOutput(row?.value || {});
}

export async function saveSystemSettingsService({ updates, updatedBy = null }) {
  const existing = await prisma.systemSetting.findUnique({ where: { key: SYSTEM_KEY } });
  const merged = { ...DEFAULTS, ...(existing?.value || {}) };

  // copy permitted fields
  const PERMITTED = ['brandName', 'accentColor', 'logoUrl', 'retentionDays'];
  for (const key of PERMITTED) {
    if (key in (updates || {})) merged[key] = updates[key];
  }

  const saved = await prisma.systemSetting.upsert({
    where: { key: SYSTEM_KEY },
    create: { key: SYSTEM_KEY, value: merged, updatedBy },
    update: { value: merged, updatedBy }
  });

  return maskOutput(saved.value);
}

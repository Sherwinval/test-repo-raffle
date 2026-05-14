import prisma from '../prisma.js';

const SYSTEM_KEY = 'system';

const DEFAULTS = {
  brandName: 'RAFDOM',
  accentColor: '#ff8c00',
  logoUrl: '',
  smtpHost: '',
  smtpPort: 587,
  smtpUser: '',
  smtpPasswordEncrypted: null,
  smtpFrom: '',
  draftMode: true,
  retentionDays: 0
};

function maskOutput(value) {
  const out = { ...DEFAULTS, ...value };
  out.smtpPasswordMasked = !!out.smtpPasswordEncrypted;
  delete out.smtpPasswordEncrypted;
  return out;
}

// Lightweight obfuscation. NOT real encryption — for the encryption-at-rest
// requirement, swap to `crypto.createCipheriv('aes-256-gcm', SETTINGS_ENC_KEY, iv)`.
function encryptPassword(plain) {
  if (!plain) return null;
  return Buffer.from(`OBF:${plain}`).toString('base64');
}

export async function loadSystemSettings() {
  const row = await prisma.systemSetting.findUnique({ where: { key: SYSTEM_KEY } });
  return maskOutput(row?.value || {});
}

export async function saveSystemSettingsService({ updates, updatedBy = null }) {
  const existing = await prisma.systemSetting.findUnique({ where: { key: SYSTEM_KEY } });
  const merged = { ...DEFAULTS, ...(existing?.value || {}) };

  // copy permitted fields
  const PERMITTED = ['brandName', 'accentColor', 'logoUrl', 'smtpHost', 'smtpPort', 'smtpUser', 'smtpFrom', 'draftMode', 'retentionDays'];
  for (const key of PERMITTED) {
    if (key in (updates || {})) merged[key] = updates[key];
  }
  if (typeof updates?.smtpPassword === 'string' && updates.smtpPassword.length > 0) {
    merged.smtpPasswordEncrypted = encryptPassword(updates.smtpPassword);
  }

  const saved = await prisma.systemSetting.upsert({
    where: { key: SYSTEM_KEY },
    create: { key: SYSTEM_KEY, value: merged, updatedBy },
    update: { value: merged, updatedBy }
  });

  return maskOutput(saved.value);
}

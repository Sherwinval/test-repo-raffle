import { loadSystemSettings, saveSystemSettingsService } from '../services/settings.service.js';
import { smtpTest } from '../services/mail.service.js';
import { resolveRequestOperator } from '../middleware/requireRole.js';

export async function getSystemSettingsHandler(_req, res) {
  try {
    res.json(await loadSystemSettings());
  } catch (err) {
    res.status(500).json({ error: 'Failed to load settings.' });
  }
}

export async function putSystemSettingsHandler(req, res) {
  const operator = resolveRequestOperator(req);
  try {
    const saved = await saveSystemSettingsService({ updates: req.body || {}, updatedBy: operator });
    res.json(saved);
  } catch (err) {
    console.error('Settings put failed:', err);
    res.status(500).json({ error: 'Failed to save settings.' });
  }
}

export async function smtpTestHandler(_req, res) {
  try {
    const result = await smtpTest();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

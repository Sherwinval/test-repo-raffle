import {
  listNotifications,
  unreadCount,
  markRead,
  markAllRead,
  getPreferences,
  savePreferences
} from '../services/notification.service.js';

const LOCAL_USER = 'local-operator';

export async function listHandler(req, res) {
  try {
    const data = await listNotifications({
      userId: req.query.userId || LOCAL_USER,
      limit: parseInt(req.query.limit) || 50,
      unreadOnly: req.query.unreadOnly === 'true'
    });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load notifications.' });
  }
}

export async function unreadCountHandler(req, res) {
  try {
    res.json(await unreadCount(req.query.userId || LOCAL_USER));
  } catch (err) {
    res.status(500).json({ error: 'Failed to load count.' });
  }
}

export async function markReadHandler(req, res) {
  try {
    const updated = await markRead(req.params.id);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to mark read.' });
  }
}

export async function markAllReadHandler(req, res) {
  try {
    const result = await markAllRead(req.body?.userId || LOCAL_USER);
    res.json({ updated: result.count });
  } catch (err) {
    res.status(500).json({ error: 'Failed to mark all read.' });
  }
}

export async function getPreferencesHandler(req, res) {
  try {
    res.json(await getPreferences(req.query.userId || LOCAL_USER));
  } catch (err) {
    res.status(500).json({ error: 'Failed to load preferences.' });
  }
}

export async function savePreferencesHandler(req, res) {
  try {
    const prefs = await savePreferences(req.body?.userId || LOCAL_USER, req.body || {});
    res.json(prefs);
  } catch (err) {
    res.status(500).json({ error: 'Failed to save preferences.' });
  }
}

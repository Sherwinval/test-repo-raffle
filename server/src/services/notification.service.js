import { randomUUID } from 'crypto';
import Notification from '../models/Notification.js';
import NotificationPreference from '../models/NotificationPreference.js';

const DEFAULT_PREFS = { UPLOAD: { IN_APP: true, EMAIL: false }, DRAW: { IN_APP: true, EMAIL: false }, RULE_CHANGE: { IN_APP: true, EMAIL: false }, WINNER: { IN_APP: true, EMAIL: true }, SYSTEM: { IN_APP: true, EMAIL: true } };
const VALID_TYPES = new Set(Object.keys(DEFAULT_PREFS));
export const defaultPreferences = () => JSON.parse(JSON.stringify(DEFAULT_PREFS));

export async function emit({ type, eventId = null, userIds = null, entityId = null, summary, payload = {} }) {
  if (!VALID_TYPES.has(type)) return null;
  const targets = Array.isArray(userIds) && userIds.length > 0 ? userIds : [null];
  await Notification.insertMany(targets.map((userId) => ({ _id: randomUUID(), userId, type, eventId, entityId, summary: String(summary || type), payload })), { ordered: false });
  return true;
}

export async function listNotifications({ userId = null, limit = 50, unreadOnly = false } = {}) {
  const where = {}; if (userId !== undefined) where.userId = userId; if (unreadOnly) where.readAt = null;
  return { items: await Notification.find(where).sort({ createdAt: -1 }).limit(Math.min(200, Math.max(1, limit))).lean() };
}
export async function unreadCount(userId = null) { return { count: await Notification.countDocuments({ userId, readAt: null }) }; }
export async function markRead(id) { return Notification.findByIdAndUpdate(id, { $set: { readAt: new Date() } }, { new: true }).lean(); }
export async function markAllRead(userId = null) { const r = await Notification.updateMany({ userId, readAt: null }, { $set: { readAt: new Date() } }); return { count: r.modifiedCount }; }

export async function getPreferences(userId = 'local-operator') {
  const rows = await NotificationPreference.find({ userId }).lean();
  if (!rows.length) return defaultPreferences();
  const prefs = defaultPreferences();
  for (const row of rows) { if (!prefs[row.category]) prefs[row.category] = {}; prefs[row.category][row.channel] = row.enabled; }
  return prefs;
}

export async function savePreferences(userId, prefs) {
  const ops = [];
  for (const [category, channels] of Object.entries(prefs || {})) {
    if (!VALID_TYPES.has(category)) continue;
    for (const [channel, enabled] of Object.entries(channels || {})) {
      if (channel !== 'IN_APP' && channel !== 'EMAIL') continue;
      ops.push(NotificationPreference.findOneAndUpdate({ userId, category, channel }, { $set: { enabled: !!enabled }, $setOnInsert: { _id: randomUUID() } }, { upsert: true }));
    }
  }
  await Promise.all(ops);
  return getPreferences(userId);
}

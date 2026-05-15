import { randomUUID } from 'crypto';
import AuditLog from '../models/AuditLog.js';
import Event from '../models/Event.js';

const DEFAULT_OPERATOR = 'Raffle Operator';

export async function appendAuditLog({ eventId, action, operator, userId = null, details = {} }) {
  if (!eventId || !action) return null;
  return AuditLog.create({ _id: randomUUID(), eventId, action, operator: String(operator || DEFAULT_OPERATOR).trim() || DEFAULT_OPERATOR, userId, details });
}

export async function listAuditLogs(eventId) {
  return AuditLog.find({ eventId }).sort({ createdAt: 1 }).select('_id action operator details createdAt').lean().then((rows) => rows.map((r) => ({ ...r, id: r._id })));
}

export async function listRecentAuditLogs({ limit = 10, eventIds = null } = {}) {
  const where = eventIds ? { eventId: { $in: eventIds } } : {};
  const rows = await AuditLog.find(where).sort({ createdAt: -1 }).limit(Math.min(100, Math.max(1, limit))).lean();
  const eventMap = new Map((await Event.find({ _id: { $in: [...new Set(rows.map((r) => r.eventId).filter(Boolean))] } }).select('_id name').lean()).map((e) => [e._id, e]));
  return rows.map((r) => ({ ...r, id: r._id, event: eventMap.has(r.eventId) ? { name: eventMap.get(r.eventId).name } : null }));
}

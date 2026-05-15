import { randomUUID } from 'crypto';
import Event from '../models/Event.js';
import Entry from '../models/Entry.js';
import Participant from '../models/Participant.js';
import Winner from '../models/Winner.js';
import UploadBatch from '../models/UploadBatch.js';
import Notification from '../models/Notification.js';
import AuditLog from '../models/AuditLog.js';
import BrandAsset from '../models/BrandAsset.js';
import { appendAuditLog, listAuditLogs } from '../services/audit.service.js';

export async function listEvents(_req, res) {
  try {
    const events = await Event.find({}).sort({ createdAt: -1 }).lean();
    const counts = await Entry.aggregate([{ $group: { _id: '$eventId', count: { $sum: 1 } } }]);
    const countMap = new Map(counts.map((c) => [c._id, c.count]));
    res.json(events.map((e) => ({ id: e._id, name: e.name, createdAt: e.createdAt, entriesCount: countMap.get(e._id) || 0, status: e.status })));
  } catch { res.status(500).json({ error: 'Failed to fetch events.' }); }
}

export async function createEvent(req, res) {
  const name = String(req.body?.name || '').trim(); if (!name) return res.status(400).json({ error: 'Event name is required.' });
  try { const event = await Event.create({ _id: randomUUID(), name, status: 'Draft' }); await appendAuditLog({ eventId: event._id, action: 'event_created', operator: req.body?.operator, details: { eventName: event.name } }); res.status(201).json({ ...event.toObject(), id: event._id }); } catch { res.status(500).json({ error: 'Failed to create event.' }); }
}

export async function publishEvent(req, res) {
  const { eventId } = req.params;
  try { const event = await Event.findByIdAndUpdate(eventId, { $set: { status: 'Active' } }, { new: true }).lean(); if (!event) return res.status(404).json({ error: 'Event not found.' }); await appendAuditLog({ eventId, action: 'event_published', operator: req.body?.operator, details: { status: event.status } }); res.json({ ...event, id: event._id }); } catch { res.status(500).json({ error: 'Failed to publish event.' }); }
}

export async function listEventAudit(req, res) {
  const { eventId } = req.params;
  try {
    const event = await Event.findById(eventId).select('_id name createdAt').lean(); if (!event) return res.status(404).json({ error: 'Event not found.' });
    const [logs, entryCount] = await Promise.all([listAuditLogs(eventId), Entry.countDocuments({ eventId })]);
    res.json({ event: { ...event, id: event._id }, entryCount, logs });
  } catch { res.status(500).json({ error: 'Failed to fetch audit log.' }); }
}

export async function createEventAudit(req, res) {
  const { eventId } = req.params; const action = String(req.body?.action || '').trim(); if (!action) return res.status(400).json({ error: 'Audit action is required.' });
  try { const event = await Event.findById(eventId).lean(); if (!event) return res.status(404).json({ error: 'Event not found.' }); const log = await appendAuditLog({ eventId, action, operator: req.body?.operator, details: req.body?.details || {} }); res.status(201).json(log); } catch { res.status(500).json({ error: 'Failed to write audit log.' }); }
}

export async function deleteEvent(req, res) {
  const { eventId } = req.params;
  try {
    const event = await Event.findById(eventId).lean(); if (!event) return res.status(404).json({ error: 'Event not found.' });
    const entries = await Entry.find({ eventId }).select('participantId').lean();
    const participantIds = [...new Set(entries.map((e) => e.participantId).filter(Boolean))];
    const shared = await Entry.find({ participantId: { $in: participantIds }, eventId: { $ne: eventId } }).select('participantId').lean();
    const sharedSet = new Set(shared.map((s) => s.participantId));
    const deleteParticipants = participantIds.filter((id) => !sharedSet.has(id));

    await Promise.all([
      Notification.deleteMany({ eventId }), Winner.deleteMany({ eventId }), AuditLog.deleteMany({ eventId }), BrandAsset.updateMany({ scopeId: eventId }, { $set: { scopeId: null } }), Entry.deleteMany({ eventId }), UploadBatch.deleteMany({ eventId }), Event.deleteOne({ _id: eventId }), deleteParticipants.length ? Participant.deleteMany({ _id: { $in: deleteParticipants } }) : Promise.resolve()
    ]);
    res.json({ deleted: true });
  } catch { res.status(500).json({ error: 'Failed to delete event.' }); }
}


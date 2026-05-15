import Participant from '../models/Participant.js';
import Entry from '../models/Entry.js';
import Winner from '../models/Winner.js';

const STATUSES = new Set(['ACTIVE', 'INACTIVE', 'EXCLUDED']);
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

export async function getParticipantStats(_req, res) { res.json({ totalParticipants: await Participant.countDocuments({}) }); }
export async function getParticipantFacets(_req, res) { const grouped = await Participant.aggregate([{ $group: { _id: '$status', c: { $sum: 1 } } }]); const statusCounts = {}; let total = 0; grouped.forEach((g) => { statusCounts[g._id] = g.c; total += g.c; }); res.json({ statusCounts, total }); }

export async function listParticipants(req, res) {
  const search = String(req.query.search || '').trim(); const status = String(req.query.status || '').trim(); const eventId = String(req.query.eventId || '').trim(); const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(req.query.limit) || DEFAULT_LIMIT)); const page = Math.max(1, parseInt(req.query.page) || 1); const offset = (page - 1) * limit;
  const where = { ...(status && STATUSES.has(status) ? { status } : {}), ...(search ? { $or: [{ employeeId: { $regex: search, $options: 'i' } }, { firstName: { $regex: search, $options: 'i' } }, { lastName: { $regex: search, $options: 'i' } }] } : {}) };
  if (eventId) { const ids = await Entry.distinct('participantId', { eventId }); where._id = { $in: ids.filter(Boolean) }; }
  const [total, items] = await Promise.all([Participant.countDocuments(where), Participant.find(where).sort({ createdAt: -1, _id: -1 }).skip(offset).limit(limit).lean()]);
  res.json({ items: items.map((i) => ({ ...i, id: i._id })), total, totalPages: Math.ceil(total / limit), currentPage: page });
}

export async function getParticipant(req, res) {
  const participant = await Participant.findById(req.params.id).lean(); if (!participant) return res.status(404).json({ error: 'Participant not found.' });
  const [entries, winners] = await Promise.all([Entry.find({ participantId: req.params.id }).sort({ createdAt: -1 }).limit(50).lean(), Winner.find({ participantId: req.params.id }).sort({ createdAt: -1 }).lean()]);
  res.json({ ...participant, id: participant._id, entries: entries.map((e) => ({ ...e, id: e._id })), winners: winners.map((w) => ({ ...w, id: w._id })) });
}

export async function updateParticipant(req, res) {
  const data = {}; if (req.body?.status && STATUSES.has(req.body.status)) data.status = req.body.status; if (Array.isArray(req.body?.tags)) data.tags = req.body.tags.map((t) => String(t).trim()).filter(Boolean); if (typeof req.body?.firstName === 'string') data.firstName = req.body.firstName.trim() || null; if (typeof req.body?.lastName === 'string') data.lastName = req.body.lastName.trim() || null; if (typeof req.body?.role === 'string') data.role = req.body.role.trim() || null; if (typeof req.body?.site === 'string') data.site = req.body.site.trim() || null;
  if (!Object.keys(data).length) return res.status(400).json({ error: 'No updatable fields provided.' });
  const updated = await Participant.findByIdAndUpdate(req.params.id, { $set: data }, { new: true }).lean(); if (!updated) return res.status(404).json({ error: 'Participant not found.' }); res.json({ ...updated, id: updated._id });
}

export async function mergeParticipants(req, res) {
  const { keepId, removeId } = req.body || {}; if (!keepId || !removeId || keepId === removeId) return res.status(400).json({ error: 'keepId and removeId required (and must differ).' });
  await Promise.all([Entry.updateMany({ participantId: removeId }, { $set: { participantId: keepId } }), Winner.updateMany({ participantId: removeId }, { $set: { participantId: keepId } }), Participant.deleteOne({ _id: removeId })]);
  const result = await Participant.findById(keepId).lean(); res.json(result ? { ...result, id: result._id } : null);
}

export async function bulkTagParticipants(req, res) {
  const { ids = [], addTags = [], removeTags = [] } = req.body || {}; if (!Array.isArray(ids) || !ids.length) return res.status(400).json({ error: 'ids array required.' });
  const participants = await Participant.find({ _id: { $in: ids } }).lean();
  await Promise.all(participants.map((p) => { const next = new Set(p.tags || []); for (const t of removeTags) next.delete(t); for (const t of addTags) if (t) next.add(t); return Participant.updateOne({ _id: p._id }, { $set: { tags: Array.from(next) } }); }));
  res.json({ updated: participants.length });
}

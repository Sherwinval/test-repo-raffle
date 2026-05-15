import Event from '../models/Event.js';
import Entry from '../models/Entry.js';
import Winner from '../models/Winner.js';
import Participant from '../models/Participant.js';
import { appendAuditLog } from '../services/audit.service.js';
import { resolveRequestOperator } from '../middleware/requireRole.js';
import { getRuleSetForEvent, saveRuleSetForEvent, previewEligibility } from '../services/rules.service.js';

export async function getRules(req, res) {
  const { eventId } = req.params;
  const event = await Event.findById(eventId).lean();
  if (!event) return res.status(404).json({ error: 'Event not found.' });
  res.json(await getRuleSetForEvent(eventId));
}

export async function putRules(req, res) {
  const { eventId } = req.params;
  const event = await Event.findById(eventId).lean();
  if (!event) return res.status(404).json({ error: 'Event not found.' });
  const saved = await saveRuleSetForEvent(eventId, req.body || {});
  await appendAuditLog({ eventId, action: 'rules_updated', operator: resolveRequestOperator(req), details: { categories: saved.categories.length, weights: saved.weights.length, constraints: saved.constraints.length, crossCategoryExclusion: saved.crossCategoryExclusion } });
  res.json(saved);
}

export async function getRulesPreview(req, res) {
  const { eventId } = req.params;
  const event = await Event.findById(eventId).lean();
  if (!event) return res.status(404).json({ error: 'Event not found.' });
  const ruleSet = await getRuleSetForEvent(eventId);
  const entries = await Entry.find({ eventId }).lean();
  const participants = await Participant.find({ _id: { $in: [...new Set(entries.map((e) => e.participantId).filter(Boolean))] } }).lean();
  const pMap = new Map(participants.map((p) => [p._id, p]));
  const winners = await Winner.find({ eventId }).lean();
  res.json(previewEligibility({ entries: entries.map((e) => ({ ...e, participant: pMap.get(e.participantId) || null })), ruleSet, winners }));
}

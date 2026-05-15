import { randomBytes, randomUUID } from 'crypto';
import Entry from '../models/Entry.js';
import Winner from '../models/Winner.js';
import Participant from '../models/Participant.js';
import Event from '../models/Event.js';
import { getRuleSetForEvent, filterByExclusionRules, computeWeight } from './rules.service.js';

const secureRandomFloat = () => { const b = randomBytes(8); const high = b.readUInt32BE(0) & 0x1fffff; const low = b.readUInt32BE(4); return (high * 0x100000000 + low) / Math.pow(2, 53); };
const fingerprint = () => randomBytes(16).toString('hex');

export async function loadEligiblePool(eventId, prizeCategoryId = null) {
  const ruleSet = await getRuleSetForEvent(eventId);
  const entries = await Entry.find({ eventId }).lean();
  const participants = await Participant.find({ _id: { $in: [...new Set(entries.map((e) => e.participantId).filter(Boolean))] } }).lean();
  const pMap = new Map(participants.map((p) => [p._id, p]));
  const joined = entries.map((e) => ({ ...e, id: e._id, participant: e.participantId ? pMap.get(e.participantId) || null : null }));
  const winners = await Winner.find({ eventId }).lean();
  let pool = filterByExclusionRules({ entries: joined, ruleSet, winners });
  if (prizeCategoryId) {
    const category = (ruleSet.categories || []).find((c) => (c.id || c._id) === prizeCategoryId);
    if (category?.tier === 'MINI') {
      const set = new Set(winners.filter((w) => w.status === 'CONFIRMED' && w.prizeCategoryId === prizeCategoryId).map((w) => w.participantId).filter(Boolean));
      pool = pool.filter((e) => !e.participantId || !set.has(e.participantId));
    }
  }
  return { pool, ruleSet };
}

export function sampleWeighted(items, weights) { let best = null; let bestKey = -Infinity; for (let i = 0; i < items.length; i += 1) { const w = Math.max(0.0001, weights[i]); const key = Math.log(secureRandomFloat()) / w; if (key > bestKey) { bestKey = key; best = items[i]; } } return best ? { item: best, key: bestKey } : null; }
export function applyHardConstraints({ pool, ruleSet, winners, prizeCategoryId }) { const constraints = (ruleSet.constraints || []).filter((c) => c.type === 'HARD'); if (!constraints.length) return pool; const winnerEntries = winners.filter((w) => w.status === 'CONFIRMED').filter((w) => !prizeCategoryId || w.prizeCategoryId === prizeCategoryId); return pool.filter((entry) => constraints.every((c) => { const value = entry[c.attribute] ?? entry.participant?.[c.attribute] ?? null; if (!value) return true; const count = winnerEntries.filter((w) => w.ruleSnapshot?.entryAttributes?.[c.attribute] === value).length; return count < c.maxPerValue; })); }

export async function drawWinner({ eventId, prizeCategoryId = null }) {
  const { pool, ruleSet } = await loadEligiblePool(eventId, prizeCategoryId);
  if (!pool.length) { const err = new Error('No eligible entries.'); err.statusCode = 409; throw err; }
  const winners = await Winner.find({ eventId }).lean();
  const filtered = applyHardConstraints({ pool, ruleSet, winners, prizeCategoryId });
  if (!filtered.length) { const err = new Error('All eligible entries blocked by constraints.'); err.statusCode = 409; throw err; }
  const weights = filtered.map((e) => computeWeight(e, ruleSet.weights || []));
  const sample = sampleWeighted(filtered, weights);
  if (!sample) { const err = new Error('Sampling failed.'); err.statusCode = 500; throw err; }
  return { entry: sample.item, fingerprint: fingerprint(), ruleSet, poolSize: filtered.length, weights: weights.length };
}

export async function persistWinner({ eventId, entry, fingerprint: fp, ruleSet, operator, prizeCategoryId = null }) {
  const winner = await Winner.create({ _id: randomUUID(), eventId, entryId: entry._id || entry.id, participantId: entry.participantId || null, prizeCategoryId, operator, rngFingerprint: fp, ruleSnapshot: { ruleSetId: ruleSet?.id || null, crossCategoryExclusion: ruleSet?.crossCategoryExclusion || false, excludeInactive: ruleSet?.excludeInactive ?? true, weights: (ruleSet?.weights || []).map((w) => ({ attribute: w.attribute, operator: w.operator, value: w.value, multiplier: w.multiplier })), constraints: (ruleSet?.constraints || []).map((c) => ({ attribute: c.attribute, maxPerValue: c.maxPerValue, type: c.type })), entryAttributes: { department: entry.department, site: entry.participant?.site || null, role: entry.participant?.role || null } }, status: 'CONFIRMED' });
  return winner.toObject();
}

export async function listDraws({ eventId, status, limit = 100 }) {
  const where = {}; if (eventId) where.eventId = eventId; if (status) where.status = status;
  const items = await Winner.find(where).sort({ createdAt: -1 }).limit(Math.min(500, Math.max(1, limit))).lean();
  const events = await Event.find({ _id: { $in: [...new Set(items.map((d) => d.eventId).filter(Boolean))] } }).select('_id name').lean();
  const entries = await Entry.find({ _id: { $in: [...new Set(items.map((d) => d.entryId).filter(Boolean))] } }).select('_id fullName employeeId entryCode email').lean();
  const eventMap = new Map(events.map((e) => [e._id, e])); const entryMap = new Map(entries.map((e) => [e._id, e]));
  return { items: items.map((d) => ({ ...d, id: d._id, event: eventMap.get(d.eventId) ? { id: d.eventId, name: eventMap.get(d.eventId).name } : null, entry: entryMap.get(d.entryId) || null, prizeCategory: null })) };
}

export async function voidWinner({ id, reason, operator }) { if (!reason || reason.trim().length < 10) { const err = new Error('Reason must be at least 10 characters.'); err.statusCode = 400; throw err; } return Winner.findByIdAndUpdate(id, { status: 'VOIDED', voidReason: reason.trim(), voidedAt: new Date(), operator }, { new: true }).lean(); }
export async function resetWinnersForEvent(eventId) { const res = await Winner.updateMany({ eventId, status: 'CONFIRMED' }, { $set: { status: 'RESET' } }); return { count: res.modifiedCount }; }

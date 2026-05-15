import Winner from '../models/Winner.js';
import Entry from '../models/Entry.js';
import Participant from '../models/Participant.js';
import { appendAuditLog } from '../services/audit.service.js';
import { resolveRequestOperator } from '../middleware/requireRole.js';
import { drawWinner, persistWinner, listDraws, voidWinner, resetWinnersForEvent } from '../services/draws.service.js';
import { emit } from '../services/notification.service.js';

export async function listDrawsHandler(req, res) { try { res.json(await listDraws({ eventId: req.query.eventId || undefined, status: req.query.status || undefined, limit: parseInt(req.query.limit) || 100 })); } catch { res.status(500).json({ error: 'Failed to load draws.' }); } }
export async function getDrawHandler(req, res) { const draw = await Winner.findById(req.params.id).lean(); if (!draw) return res.status(404).json({ error: 'Draw not found.' }); res.json({ ...draw, id: draw._id }); }
export async function executeDrawHandler(req, res) { try { const result = await drawWinner({ eventId: req.params.eventId, prizeCategoryId: req.body?.prizeCategoryId || null }); res.json({ entry: result.entry, fingerprint: result.fingerprint, poolSize: result.poolSize, ruleSetId: result.ruleSet?.id || null }); } catch (err) { res.status(err.statusCode || 500).json({ error: err.message }); } }

export async function confirmWinnerHandler(req, res) {
  const { eventId } = req.params; const { entryId, fingerprint, prizeCategoryId = null, redrawReason = null } = req.body || {}; if (!entryId || !fingerprint) return res.status(400).json({ error: 'entryId and fingerprint required.' });
  const operator = resolveRequestOperator(req);
  try {
    const entry = await Entry.findById(entryId).lean(); if (!entry) return res.status(404).json({ error: 'Entry not found.' });
    if (entry.eventId !== eventId) return res.status(400).json({ error: 'Entry does not belong to this event.' });
    const participant = entry.participantId ? await Participant.findById(entry.participantId).lean() : null;
    if (participant?.status && participant.status !== 'ACTIVE') return res.status(409).json({ error: `Participant status is ${participant.status}; cannot confirm.` });
    const { getRuleSetForEvent } = await import('../services/rules.service.js'); const ruleSet = await getRuleSetForEvent(eventId);
    const existingWinner = await Winner.findOne({ eventId, entryId, status: 'CONFIRMED' }).lean(); if (existingWinner) return res.status(409).json({ error: 'Winner already confirmed for this entry.' });
    const winner = await persistWinner({ eventId, entry: { ...entry, participant }, fingerprint, ruleSet, operator, prizeCategoryId });
    await appendAuditLog({ eventId, action: 'winner_confirmed', operator, details: { winnerId: winner.id || winner._id, entryId: winner.entryId, employeeId: entry.employeeId, fingerprint, prizeCategoryId, redrawReason } });
    await emit({ type: 'DRAW', eventId, entityId: winner.id || winner._id, summary: `Winner confirmed: ${entry.fullName} (${entry.employeeId})`, payload: { winnerId: winner.id || winner._id, entryId: winner.entryId, prizeCategoryId } });
    res.status(201).json(winner);
  } catch (err) { res.status(500).json({ error: err.message || 'Failed to confirm winner.' }); }
}

export async function voidDrawHandler(req, res) { const id = req.params.id; const reason = String(req.body?.reason || '').trim(); const operator = resolveRequestOperator(req); try { const before = await Winner.findById(id).lean(); if (!before) return res.status(404).json({ error: 'Draw not found.' }); const updated = await voidWinner({ id, reason, operator }); await appendAuditLog({ eventId: before.eventId, action: 'winner_voided', operator, details: { winnerId: id, reason, entryId: before.entryId } }); await emit({ type: 'DRAW', eventId: before.eventId, entityId: id, summary: 'A winner was voided', payload: { winnerId: id, reason } }); res.json(updated); } catch (err) { res.status(err.statusCode || 500).json({ error: err.message }); } }
export async function resetEventDrawsHandler(req, res) { try { const result = await resetWinnersForEvent(req.params.eventId); await appendAuditLog({ eventId: req.params.eventId, action: 'draws_reset', operator: resolveRequestOperator(req), details: { count: result.count } }); res.json({ reset: result.count }); } catch { res.status(500).json({ error: 'Failed to reset draws.' }); } }
export async function exportDrawsHandler(req, res) { try { const { items } = await listDraws({ eventId: req.query.eventId || undefined, status: req.query.status || undefined, limit: 500 }); if (String(req.query.format || 'csv').toLowerCase() === 'csv') { const header = ['id', 'event', 'entry', 'employeeId', 'category', 'tier', 'operator', 'status', 'createdAt', 'fingerprint']; const rows = items.map((d) => [d.id || d._id, d.event?.name || '', d.entry?.fullName || '', d.entry?.employeeId || '', d.prizeCategory?.name || '', d.prizeCategory?.tier || '', d.operator, d.status, new Date(d.createdAt).toISOString(), d.rngFingerprint]); const csv = [header, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n'); res.setHeader('Content-Type', 'text/csv'); res.setHeader('Content-Disposition', 'attachment; filename="draws.csv"'); return res.send(csv); } res.json({ items }); } catch { res.status(500).json({ error: 'Failed to export draws.' }); } }

import prisma from '../prisma.js';
import { appendAuditLog } from '../services/audit.service.js';
import { resolveRequestOperator } from '../middleware/requireRole.js';
import { drawWinner, persistWinner, listDraws, voidWinner, resetWinnersForEvent } from '../services/draws.service.js';
import { emit } from '../services/notification.service.js';

export async function listDrawsHandler(req, res) {
  try {
    const data = await listDraws({
      eventId: req.query.eventId || undefined,
      status: req.query.status || undefined,
      limit: parseInt(req.query.limit) || 100
    });
    res.json(data);
  } catch (err) {
    console.error('Draws list failed:', err);
    res.status(500).json({ error: 'Failed to load draws.' });
  }
}

export async function getDrawHandler(req, res) {
  const { id } = req.params;
  try {
    const draw = await prisma.winner.findUnique({
      where: { id },
      include: {
        event: { select: { id: true, name: true } },
        entry: true,
        prizeCategory: true,
        participant: true
      }
    });
    if (!draw) return res.status(404).json({ error: 'Draw not found.' });
    res.json(draw);
  } catch (err) {
    console.error('Draw get failed:', err);
    res.status(500).json({ error: 'Failed to load draw.' });
  }
}

export async function executeDrawHandler(req, res) {
  const { eventId } = req.params;
  const prizeCategoryId = req.body?.prizeCategoryId || null;
  try {
    const result = await drawWinner({ eventId, prizeCategoryId });
    res.json({
      entry: result.entry,
      fingerprint: result.fingerprint,
      poolSize: result.poolSize,
      ruleSetId: result.ruleSet?.id || null
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
}

export async function confirmWinnerHandler(req, res) {
  const { eventId } = req.params;
  const { entryId, fingerprint, prizeCategoryId = null, redrawReason = null } = req.body || {};
  if (!entryId || !fingerprint) {
    return res.status(400).json({ error: 'entryId and fingerprint required.' });
  }
  const operator = resolveRequestOperator(req);
  try {
    const entry = await prisma.entry.findUnique({ where: { id: entryId }, include: { participant: true } });
    if (!entry) return res.status(404).json({ error: 'Entry not found.' });
    if (entry.eventId !== eventId) return res.status(400).json({ error: 'Entry does not belong to this event.' });
    if (entry.participant?.status && entry.participant.status !== 'ACTIVE') {
      return res.status(409).json({ error: `Participant status is ${entry.participant.status}; cannot confirm.` });
    }

    const { getRuleSetForEvent } = await import('../services/rules.service.js');
    const ruleSet = await getRuleSetForEvent(eventId);

    // Check if winner already exists for this entry
    const existingWinner = await prisma.winner.findFirst({
      where: {
        eventId,
        entryId,
        status: 'CONFIRMED'
      }
    });
    if (existingWinner) {
      return res.status(409).json({ error: 'Winner already confirmed for this entry.' });
    }

    const winner = await persistWinner({ eventId, entry, fingerprint, ruleSet, operator, prizeCategoryId });

    await appendAuditLog({
      eventId,
      action: 'winner_confirmed',
      operator,
      details: {
        winnerId: winner.id,
        entryId: winner.entryId,
        employeeId: entry.employeeId,
        fingerprint,
        prizeCategoryId,
        redrawReason
      }
    });

    await emit({
      type: 'DRAW',
      eventId,
      entityId: winner.id,
      summary: `Winner confirmed: ${entry.fullName} (${entry.employeeId})`,
      payload: { winnerId: winner.id, entryId: winner.entryId, prizeCategoryId }
    });

    res.status(201).json(winner);
  } catch (err) {
    console.error('Confirm winner failed:', err);
    res.status(500).json({ error: err.message || 'Failed to confirm winner.' });
  }
}

export async function voidDrawHandler(req, res) {
  const { id } = req.params;
  const reason = String(req.body?.reason || '').trim();
  const operator = resolveRequestOperator(req);
  try {
    const before = await prisma.winner.findUnique({ where: { id } });
    if (!before) return res.status(404).json({ error: 'Draw not found.' });
    const updated = await voidWinner({ id, reason, operator });
    await appendAuditLog({
      eventId: before.eventId,
      action: 'winner_voided',
      operator,
      details: { winnerId: id, reason, entryId: before.entryId }
    });
    await emit({
      type: 'DRAW',
      eventId: before.eventId,
      entityId: id,
      summary: 'A winner was voided',
      payload: { winnerId: id, reason }
    });
    res.json(updated);
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
}

export async function resetEventDrawsHandler(req, res) {
  const { eventId } = req.params;
  const operator = resolveRequestOperator(req);
  try {
    const result = await resetWinnersForEvent(eventId);
    await appendAuditLog({
      eventId,
      action: 'draws_reset',
      operator,
      details: { count: result.count }
    });
    res.json({ reset: result.count });
  } catch (err) {
    res.status(500).json({ error: 'Failed to reset draws.' });
  }
}

export async function exportDrawsHandler(req, res) {
  try {
    const { items } = await listDraws({
      eventId: req.query.eventId || undefined,
      status: req.query.status || undefined,
      limit: 500
    });
    const format = String(req.query.format || 'csv').toLowerCase();
    if (format === 'csv') {
      const header = ['id', 'event', 'entry', 'employeeId', 'category', 'tier', 'operator', 'status', 'createdAt', 'fingerprint'];
      const rows = items.map((d) => [
        d.id,
        d.event?.name || '',
        d.entry?.fullName || '',
        d.entry?.employeeId || '',
        d.prizeCategory?.name || '',
        d.prizeCategory?.tier || '',
        d.operator,
        d.status,
        d.createdAt.toISOString(),
        d.rngFingerprint
      ]);
      const csv = [header, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="draws.csv"');
      return res.send(csv);
    }
    res.json({ items });
  } catch (err) {
    res.status(500).json({ error: 'Failed to export draws.' });
  }
}

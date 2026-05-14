import prisma from '../prisma.js';
import { appendAuditLog } from '../services/audit.service.js';
import { resolveRequestOperator } from '../middleware/requireRole.js';
import { getRuleSetForEvent, saveRuleSetForEvent, previewEligibility } from '../services/rules.service.js';

export async function getRules(req, res) {
  const { eventId } = req.params;
  try {
    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) return res.status(404).json({ error: 'Event not found.' });
    const data = await getRuleSetForEvent(eventId);
    res.json(data);
  } catch (err) {
    console.error('Rules get failed:', err);
    res.status(500).json({ error: 'Failed to load rules.' });
  }
}

export async function putRules(req, res) {
  const { eventId } = req.params;
  try {
    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) return res.status(404).json({ error: 'Event not found.' });

    const saved = await saveRuleSetForEvent(eventId, req.body || {});
    await appendAuditLog({
      eventId,
      action: 'rules_updated',
      operator: resolveRequestOperator(req),
      details: {
        categories: saved.categories.length,
        weights: saved.weights.length,
        constraints: saved.constraints.length,
        crossCategoryExclusion: saved.crossCategoryExclusion
      }
    });
    res.json(saved);
  } catch (err) {
    console.error('Rules put failed:', err);
    res.status(500).json({ error: 'Failed to save rules.' });
  }
}

export async function getRulesPreview(req, res) {
  const { eventId } = req.params;
  try {
    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) return res.status(404).json({ error: 'Event not found.' });
    const ruleSet = await getRuleSetForEvent(eventId);
    const entries = await prisma.entry.findMany({
      where: { eventId },
      include: { participant: true }
    });
    const winners = await prisma.winner.findMany({ where: { eventId } });
    const preview = previewEligibility({ entries, ruleSet, winners });
    res.json(preview);
  } catch (err) {
    console.error('Rules preview failed:', err);
    res.status(500).json({ error: 'Failed to load preview.' });
  }
}

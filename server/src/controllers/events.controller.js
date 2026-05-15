import prisma from '../prisma.js';
import { appendAuditLog, listAuditLogs } from '../services/audit.service.js';

export async function listEvents(_req, res) {
  try {
    const events = await prisma.event.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        createdAt: true,
        _count: { select: { entries: true } }
      }
    });

    const mappedEvents = events.map((event) => ({
      id: event.id,
      name: event.name,
      createdAt: event.createdAt,
      entriesCount: event._count.entries,
      status: event.status
    }));

    res.json(mappedEvents);
  } catch (err) {
    console.error('Events query failed:', err);
    res.status(500).json({ error: 'Failed to fetch events.' });
  }
}

export async function createEvent(req, res) {
  const name = String(req.body?.name || '').trim();
  if (!name) return res.status(400).json({ error: 'Event name is required.' });
  try {
    const event = await prisma.event.create({ data: { name } });
    await appendAuditLog({
      eventId: event.id,
      action: 'event_created',
      operator: req.body?.operator,
      details: { eventName: event.name }
    });
    res.status(201).json(event);
  } catch (err) {
    console.error('Event create failed:', err);
    res.status(500).json({ error: 'Failed to create event.' });
  }
}

export async function publishEvent(req, res) {
  const { eventId } = req.params;
  try {
    const event = await prisma.event.update({
      where: { id: eventId },
      data: { status: 'Active' }
    });

    await appendAuditLog({
      eventId,
      action: 'event_published',
      operator: req.body?.operator,
      details: { status: event.status }
    });

    res.json(event);
  } catch (err) {
    console.error('Event publish failed:', err);
    res.status(500).json({ error: 'Failed to publish event.' });
  }
}

export async function listEventAudit(req, res) {
  const { eventId } = req.params;
  try {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, name: true, createdAt: true }
    });
    if (!event) return res.status(404).json({ error: 'Event not found.' });

    const [logs, entryCount] = await Promise.all([
      listAuditLogs(eventId),
      prisma.entry.count({ where: { eventId } })
    ]);

    res.json({ event, entryCount, logs });
  } catch (err) {
    console.error('Event audit query failed:', err);
    res.status(500).json({ error: 'Failed to fetch audit log.' });
  }
}

export async function createEventAudit(req, res) {
  const { eventId } = req.params;
  const action = String(req.body?.action || '').trim();
  if (!action) return res.status(400).json({ error: 'Audit action is required.' });

  try {
    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) return res.status(404).json({ error: 'Event not found.' });

    const log = await appendAuditLog({
      eventId,
      action,
      operator: req.body?.operator,
      details: req.body?.details || {}
    });
    res.status(201).json(log);
  } catch (err) {
    console.error('Event audit create failed:', err);
    res.status(500).json({ error: 'Failed to write audit log.' });
  }
}

export async function deleteEvent(req, res) {
  const { eventId } = req.params;
  try {
    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) return res.status(404).json({ error: 'Event not found.' });

    const [categories, ruleSets] = await Promise.all([
      prisma.prizeCategory.findMany({
        where: { eventId },
        select: { id: true }
      }),
      prisma.drawRuleSet.findMany({
        where: { eventId },
        select: { id: true }
      })
    ]);

    const categoryIds = categories.map((c) => c.id);
    const ruleSetIds = ruleSets.map((r) => r.id);

    // Collect participant IDs to delete BEFORE the transaction (while entries still exist).
    // Delete participants whose entries ALL belong to this event only (not shared with other events).
    const participantsToDelete = await prisma.participant.findMany({
      where: {
        entries: { some: { eventId } }
      },
      select: { id: true, entries: { select: { eventId: true } } }
    });
    const participantIdsToDelete = participantsToDelete
      .filter((p) => p.entries.every((e) => e.eventId === eventId))
      .map((p) => p.id);

    await prisma.$transaction([
      prisma.notification.deleteMany({ where: { eventId } }),
      prisma.winner.deleteMany({ where: { eventId } }),
      prisma.prize.deleteMany({ where: categoryIds.length ? { prizeCategoryId: { in: categoryIds } } : { prizeCategoryId: '__none__' } }),
      prisma.drawConstraint.deleteMany({ where: ruleSetIds.length ? { ruleSetId: { in: ruleSetIds } } : { ruleSetId: '__none__' } }),
      prisma.weightRule.deleteMany({ where: ruleSetIds.length ? { ruleSetId: { in: ruleSetIds } } : { ruleSetId: '__none__' } }),
      prisma.prizeCategory.deleteMany({ where: { eventId } }),
      prisma.drawRuleSet.deleteMany({ where: { eventId } }),
      prisma.auditLog.deleteMany({ where: { eventId } }),
      prisma.brandAsset.updateMany({ where: { scopeId: eventId }, data: { scopeId: null } }),
      prisma.entry.deleteMany({ where: { eventId } }),
      ...(participantIdsToDelete.length > 0
        ? [prisma.participant.deleteMany({ where: { id: { in: participantIdsToDelete } } })]
        : []),
      prisma.uploadBatch.deleteMany({ where: { eventId } }),
      prisma.event.delete({ where: { id: eventId } })
    ]);
    res.json({ deleted: true });
  } catch (err) {
    console.error('Event delete failed:', err);
    res.status(500).json({
      error: err?.message || 'Failed to delete event.',
      code: err?.code,
      meta: err?.meta
    });
  }
}

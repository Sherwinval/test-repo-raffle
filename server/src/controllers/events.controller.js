import prisma from '../prisma.js';
import { appendAuditLog, listAuditLogs } from '../services/audit.service.js';

export async function listEvents(_req, res) {
  try {
    const events = await prisma.event.findMany({
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, createdAt: true }
    });
    res.json(events);
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
    await prisma.entry.deleteMany({ where: { eventId } });
    await prisma.uploadBatch.deleteMany({ where: { eventId } });
    await prisma.event.delete({ where: { id: eventId } });
    res.json({ deleted: true });
  } catch (err) {
    console.error('Event delete failed:', err);
    res.status(500).json({ error: 'Failed to delete event.' });
  }
}

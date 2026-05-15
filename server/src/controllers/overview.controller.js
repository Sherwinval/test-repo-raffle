import prisma from '../prisma.js';
import { listRecentAuditLogs } from '../services/audit.service.js';

function isPermissionError(err) {
  return err?.code === 'EACCES' || /permission denied/i.test(String(err?.message || ''));
}

async function safe(fn, fallback, label) {
  try {
    return await fn();
  } catch (err) {
    if (isPermissionError(err)) {
      console.warn(`Overview fallback for ${label}:`, err.code || err.message);
      return fallback;
    }
    throw err;
  }
}

export async function getOverviewHandler(_req, res) {
  try {
    res.setHeader('Cache-Control', 'private, max-age=30');
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [participants, events, eventsLast30, entries, draws, winners, recent] = await Promise.all([
      safe(() => prisma.participant.count(), 0, 'participants'),
      safe(() => prisma.event.count(), 0, 'events'),
      safe(() => prisma.event.count({ where: { createdAt: { gte: thirtyDaysAgo } } }), 0, 'eventsLast30'),
      safe(() => prisma.entry.count(), 0, 'entries'),
      safe(() => prisma.winner.count(), 0, 'draws'),
      safe(() => prisma.winner.count({ where: { status: 'CONFIRMED' } }), 0, 'winners'),
      safe(() => listRecentAuditLogs({ limit: 10 }), [], 'recentActivity')
    ]);

    const myEventsRaw = await safe(
      () =>
        prisma.event.findMany({
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: {
            _count: { select: { entries: true, winners: true } }
          }
        }),
      [],
      'myEvents'
    );

    const myEvents = myEventsRaw.map((e) => ({
      id: e.id,
      name: e.name,
      createdAt: e.createdAt,
      entryCount: e._count.entries,
      winnerCount: e._count.winners
    }));

    res.json({
      counts: { participants, events, eventsLast30, entries, draws, winners },
      recentActivity: recent,
      myEvents
    });
  } catch (err) {
    console.error('Overview failed:', err);
    res.status(500).json({ error: 'Failed to load overview.' });
  }
}

import prisma from '../prisma.js';
import { listRecentAuditLogs } from '../services/audit.service.js';

export async function getOverviewHandler(_req, res) {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [participants, events, eventsLast30, entries, draws, winners, recent] = await Promise.all([
      prisma.participant.count(),
      prisma.event.count(),
      prisma.event.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      prisma.entry.count(),
      prisma.winner.count(),
      prisma.winner.count({ where: { status: 'CONFIRMED' } }),
      listRecentAuditLogs({ limit: 10 })
    ]);

    const myEventsRaw = await prisma.event.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        _count: { select: { entries: true, winners: true } }
      }
    });

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

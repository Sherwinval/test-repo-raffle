import Participant from '../models/Participant.js';
import Event from '../models/Event.js';
import Entry from '../models/Entry.js';
import Winner from '../models/Winner.js';
import { listRecentAuditLogs } from '../services/audit.service.js';

const safe = async (fn, fallback) => { try { return await fn(); } catch { return fallback; } };

export async function getOverviewHandler(_req, res) {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const [participants, events, eventsLast30, entries, draws, winners, recent] = await Promise.all([
    safe(() => Participant.countDocuments({}), 0),
    safe(() => Event.countDocuments({}), 0),
    safe(() => Event.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }), 0),
    safe(() => Entry.countDocuments({}), 0),
    safe(() => Winner.countDocuments({}), 0),
    safe(() => Winner.countDocuments({ status: 'CONFIRMED' }), 0),
    safe(() => listRecentAuditLogs({ limit: 10 }), [])
  ]);

  const myEventsRaw = await safe(() => Event.find({}).sort({ createdAt: -1 }).limit(10).lean(), []);
  const ids = myEventsRaw.map((e) => e._id);
  const [entryCounts, winnerCounts] = await Promise.all([
    Entry.aggregate([{ $match: { eventId: { $in: ids } } }, { $group: { _id: '$eventId', c: { $sum: 1 } } }]),
    Winner.aggregate([{ $match: { eventId: { $in: ids } } }, { $group: { _id: '$eventId', c: { $sum: 1 } } }])
  ]);
  const eMap = new Map(entryCounts.map((x) => [x._id, x.c]));
  const wMap = new Map(winnerCounts.map((x) => [x._id, x.c]));

  res.json({
    counts: { participants, events, eventsLast30, entries, draws, winners },
    recentActivity: recent,
    myEvents: myEventsRaw.map((e) => ({ id: e._id, name: e.name, createdAt: e.createdAt, entryCount: eMap.get(e._id) || 0, winnerCount: wMap.get(e._id) || 0 }))
  });
}

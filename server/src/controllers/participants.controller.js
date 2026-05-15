import prisma from '../prisma.js';

const STATUSES = new Set(['ACTIVE', 'INACTIVE', 'EXCLUDED']);
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

export async function getParticipantStats(_req, res) {
  try {
    const count = await prisma.participant.count();
    res.json({ totalParticipants: count });
  } catch (err) {
    console.error('Stats query failed:', err);
    res.status(500).json({ error: 'Failed to fetch stats.' });
  }
}

export async function getParticipantFacets(_req, res) {
  try {
    const grouped = await prisma.participant.groupBy({
      by: ['status'],
      _count: { _all: true }
    });
    const statusCounts = {};
    let total = 0;
    for (const row of grouped) {
      statusCounts[row.status] = row._count._all;
      total += row._count._all;
    }
    res.json({ statusCounts, total });
  } catch (err) {
    console.error('Facets query failed:', err);
    res.status(500).json({ error: 'Failed to load facets.' });
  }
}

export async function listParticipants(req, res) {
  const search = String(req.query.search || '').trim();
  const status = String(req.query.status || '').trim();
  const eventId = String(req.query.eventId || '').trim();
  const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(req.query.limit) || DEFAULT_LIMIT));
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const offset = (page - 1) * limit;

  try {
    const where = {
      ...(status && STATUSES.has(status) ? { status } : {}),
      ...(eventId ? { entries: { some: { eventId } } } : {}),
      ...(search ? {
        OR: [
          { employeeId: { contains: search, mode: 'insensitive' } },
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } }
        ]
      } : {})
    };

    const [total, items] = await Promise.all([
      prisma.participant.count({ where }),
      prisma.participant.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: offset,
        take: limit,
        select: {
          id: true, employeeId: true, email: true, firstName: true, lastName: true,
          role: true, site: true, status: true, tags: true, createdAt: true, updatedAt: true
        }
      })
    ]);

    const totalPages = Math.ceil(total / limit);

    res.json({ items, totalPages, currentPage: page });
  } catch (err) {
    console.error('Participants list failed:', err);
    res.status(500).json({ error: 'Failed to fetch participants.' });
  }
}

export async function getParticipant(req, res) {
  const { id } = req.params;
  try {
    const participant = await prisma.participant.findUnique({
      where: { id },
      include: {
        entries: {
          select: { id: true, eventId: true, entryCode: true, createdAt: true, event: { select: { name: true } } },
          orderBy: { createdAt: 'desc' },
          take: 50
        },
        winners: {
          select: {
            id: true, eventId: true, status: true, createdAt: true,
            event: { select: { name: true } },
            prizeCategory: { select: { name: true } }
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });
    if (!participant) return res.status(404).json({ error: 'Participant not found.' });
    res.json(participant);
  } catch (err) {
    console.error('Participant get failed:', err);
    res.status(500).json({ error: 'Failed to fetch participant.' });
  }
}

export async function updateParticipant(req, res) {
  const { id } = req.params;
  const data = {};
  if (req.body?.status && STATUSES.has(req.body.status)) data.status = req.body.status;
  if (Array.isArray(req.body?.tags)) data.tags = req.body.tags.map((t) => String(t).trim()).filter(Boolean);
  if (typeof req.body?.firstName === 'string') data.firstName = req.body.firstName.trim() || null;
  if (typeof req.body?.lastName === 'string') data.lastName = req.body.lastName.trim() || null;
  if (typeof req.body?.role === 'string') data.role = req.body.role.trim() || null;
  if (typeof req.body?.site === 'string') data.site = req.body.site.trim() || null;

  if (Object.keys(data).length === 0) {
    return res.status(400).json({ error: 'No updatable fields provided.' });
  }

  try {
    const updated = await prisma.participant.update({ where: { id }, data });
    res.json(updated);
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Participant not found.' });
    console.error('Participant update failed:', err);
    res.status(500).json({ error: 'Failed to update participant.' });
  }
}

export async function mergeParticipants(req, res) {
  const { keepId, removeId } = req.body || {};
  if (!keepId || !removeId || keepId === removeId) {
    return res.status(400).json({ error: 'keepId and removeId required (and must differ).' });
  }
  try {
    await prisma.$transaction([
      prisma.entry.updateMany({ where: { participantId: removeId }, data: { participantId: keepId } }),
      prisma.winner.updateMany({ where: { participantId: removeId }, data: { participantId: keepId } }),
      prisma.participant.delete({ where: { id: removeId } })
    ]);
    const result = await prisma.participant.findUnique({ where: { id: keepId } });
    res.json(result);
  } catch (err) {
    console.error('Participant merge failed:', err);
    res.status(500).json({ error: 'Failed to merge participants.' });
  }
}

export async function bulkTagParticipants(req, res) {
  const { ids = [], addTags = [], removeTags = [] } = req.body || {};
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'ids array required.' });
  }
  try {
    const participants = await prisma.participant.findMany({ where: { id: { in: ids } } });
    await prisma.$transaction(participants.map((p) => {
      const next = new Set(p.tags || []);
      for (const t of removeTags) next.delete(t);
      for (const t of addTags) if (t) next.add(t);
      return prisma.participant.update({ where: { id: p.id }, data: { tags: Array.from(next) } });
    }));
    res.json({ updated: participants.length });
  } catch (err) {
    console.error('Bulk tag failed:', err);
    res.status(500).json({ error: 'Failed to tag participants.' });
  }
}

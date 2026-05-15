import prisma from '../prisma.js';

const DEFAULT_OPERATOR = 'Raffle Operator';

export async function appendAuditLog({ eventId, action, operator, userId = null, details = {} }) {
  if (!eventId || !action) return null;

  return prisma.auditLog.create({
    data: {
      eventId,
      action,
      operator: String(operator || DEFAULT_OPERATOR).trim() || DEFAULT_OPERATOR,
      userId,
      details
    }
  });
}

export async function listAuditLogs(eventId) {
  return prisma.auditLog.findMany({
    where: { eventId },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      action: true,
      operator: true,
      details: true,
      createdAt: true
    }
  });
}

export async function listRecentAuditLogs({ limit = 10, eventIds = null } = {}) {
  return prisma.auditLog.findMany({
    where: eventIds ? { eventId: { in: eventIds } } : undefined,
    orderBy: { createdAt: 'desc' },
    take: Math.min(100, Math.max(1, limit)),
    select: {
      id: true,
      eventId: true,
      action: true,
      operator: true,
      details: true,
      createdAt: true,
      event: { select: { name: true } }
    }
  });
}

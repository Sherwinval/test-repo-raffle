import prisma from '../prisma.js';

const DEFAULT_OPERATOR = 'Raffle Operator';

export async function appendAuditLog({ eventId, action, operator, details = {} }) {
  if (!eventId || !action) return null;

  return prisma.auditLog.create({
    data: {
      eventId,
      action,
      operator: String(operator || DEFAULT_OPERATOR).trim() || DEFAULT_OPERATOR,
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

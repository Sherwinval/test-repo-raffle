import prisma from '../prisma.js';

const DEFAULT_PREFS = {
  UPLOAD: { IN_APP: true, EMAIL: false },
  DRAW: { IN_APP: true, EMAIL: false },
  RULE_CHANGE: { IN_APP: true, EMAIL: false },
  WINNER: { IN_APP: true, EMAIL: true },
  SYSTEM: { IN_APP: true, EMAIL: true }
};

const VALID_TYPES = new Set(Object.keys(DEFAULT_PREFS));

export function defaultPreferences() {
  return JSON.parse(JSON.stringify(DEFAULT_PREFS));
}

export async function emit({ type, eventId = null, userIds = null, entityId = null, summary, payload = {} }) {
  if (!VALID_TYPES.has(type)) return null;

  const targets = Array.isArray(userIds) && userIds.length > 0 ? userIds : [null];

  await Promise.all(targets.map((userId) =>
    prisma.notification.create({
      data: {
        userId,
        type,
        eventId,
        entityId,
        summary: String(summary || type),
        payload
      }
    })
  ));

  return true;
}

export async function listNotifications({ userId = null, limit = 50, unreadOnly = false } = {}) {
  const where = {};
  if (userId !== undefined) where.userId = userId;
  if (unreadOnly) where.readAt = null;
  const items = await prisma.notification.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: Math.min(200, Math.max(1, limit))
  });
  return { items };
}

export async function unreadCount(userId = null) {
  const count = await prisma.notification.count({
    where: { userId, readAt: null }
  });
  return { count };
}

export async function markRead(id) {
  return prisma.notification.update({ where: { id }, data: { readAt: new Date() } });
}

export async function markAllRead(userId = null) {
  return prisma.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() }
  });
}

export async function getPreferences(userId = 'local-operator') {
  const rows = await prisma.notificationPreference.findMany({ where: { userId } });
  if (rows.length === 0) return defaultPreferences();

  const prefs = defaultPreferences();
  for (const row of rows) {
    if (!prefs[row.category]) prefs[row.category] = {};
    prefs[row.category][row.channel] = row.enabled;
  }
  return prefs;
}

export async function savePreferences(userId, prefs) {
  const ops = [];
  for (const [category, channels] of Object.entries(prefs || {})) {
    if (!VALID_TYPES.has(category)) continue;
    for (const [channel, enabled] of Object.entries(channels || {})) {
      if (channel !== 'IN_APP' && channel !== 'EMAIL') continue;
      ops.push(prisma.notificationPreference.upsert({
        where: { userId_category_channel: { userId, category, channel } },
        create: { userId, category, channel, enabled: !!enabled },
        update: { enabled: !!enabled }
      }));
    }
  }
  await Promise.all(ops);
  return getPreferences(userId);
}

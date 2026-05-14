import prisma from '../prisma.js';

const ATTRIBUTE_GETTERS = {
  department: (entry) => entry.department,
  site: (entry) => entry.participant?.site || null,
  role: (entry) => entry.participant?.role || null
};

export async function getRuleSetForEvent(eventId) {
  const ruleSet = await prisma.drawRuleSet.findUnique({
    where: { eventId },
    include: { weights: true, constraints: true }
  });
  const categories = await prisma.prizeCategory.findMany({
    where: { eventId },
    orderBy: { displayOrder: 'asc' },
    include: { prizes: true }
  });

  if (!ruleSet) {
    return {
      id: null,
      eventId,
      crossCategoryExclusion: false,
      weightCapMultiplier: 10,
      excludeInactive: true,
      weights: [],
      constraints: [],
      categories
    };
  }

  return { ...ruleSet, categories };
}

export async function saveRuleSetForEvent(eventId, payload) {
  const ruleSet = await prisma.drawRuleSet.upsert({
    where: { eventId },
    create: {
      eventId,
      crossCategoryExclusion: !!payload.crossCategoryExclusion,
      weightCapMultiplier: Math.max(1, Number(payload.weightCapMultiplier) || 10),
      excludeInactive: payload.excludeInactive ?? true
    },
    update: {
      crossCategoryExclusion: !!payload.crossCategoryExclusion,
      weightCapMultiplier: Math.max(1, Number(payload.weightCapMultiplier) || 10),
      excludeInactive: payload.excludeInactive ?? true
    }
  });

  // Replace weights
  await prisma.weightRule.deleteMany({ where: { ruleSetId: ruleSet.id } });
  if (Array.isArray(payload.weights) && payload.weights.length > 0) {
    await prisma.weightRule.createMany({
      data: payload.weights.map((w) => ({
        ruleSetId: ruleSet.id,
        attribute: String(w.attribute || '').trim(),
        operator: String(w.operator || 'equals').trim(),
        value: String(w.value || '').trim(),
        multiplier: Math.min(ruleSet.weightCapMultiplier, Math.max(0.1, Number(w.multiplier) || 1))
      })).filter((w) => w.attribute && w.value !== '')
    });
  }

  // Replace constraints
  await prisma.drawConstraint.deleteMany({ where: { ruleSetId: ruleSet.id } });
  if (Array.isArray(payload.constraints) && payload.constraints.length > 0) {
    await prisma.drawConstraint.createMany({
      data: payload.constraints.map((c) => ({
        ruleSetId: ruleSet.id,
        attribute: String(c.attribute || '').trim(),
        maxPerValue: Math.max(1, parseInt(c.maxPerValue) || 1),
        type: c.type === 'SOFT' ? 'SOFT' : 'HARD',
        categoryScope: c.categoryScope || null
      })).filter((c) => c.attribute)
    });
  }

  // Upsert categories: incoming list replaces existing
  const existingCategories = await prisma.prizeCategory.findMany({ where: { eventId } });
  const existingById = new Map(existingCategories.map((c) => [c.id, c]));
  const incomingIds = new Set();

  for (const [idx, cat] of (payload.categories || []).entries()) {
    const data = {
      eventId,
      name: String(cat.name || '').trim() || 'Untitled category',
      tier: cat.tier === 'MAJOR' ? 'MAJOR' : 'MINI',
      prizeCount: Math.max(1, parseInt(cat.prizeCount) || 1),
      displayOrder: idx
    };
    if (cat.id && existingById.has(cat.id)) {
      incomingIds.add(cat.id);
      await prisma.prizeCategory.update({ where: { id: cat.id }, data });
    } else {
      const created = await prisma.prizeCategory.create({ data });
      incomingIds.add(created.id);
    }
  }
  // Delete categories that were removed
  const toDelete = existingCategories.filter((c) => !incomingIds.has(c.id)).map((c) => c.id);
  if (toDelete.length > 0) {
    await prisma.prizeCategory.deleteMany({ where: { id: { in: toDelete } } });
  }

  return getRuleSetForEvent(eventId);
}

function getAttribute(entry, attribute) {
  const getter = ATTRIBUTE_GETTERS[attribute];
  if (!getter) return entry[attribute] ?? null;
  return getter(entry);
}

function matchesRule(entry, rule) {
  const actual = String(getAttribute(entry, rule.attribute) ?? '').toLowerCase();
  const expected = String(rule.value ?? '').toLowerCase();
  if (rule.operator === 'not_equals') return actual !== expected;
  return actual === expected;
}

export function computeWeight(entry, weights) {
  if (!weights || weights.length === 0) return 1;
  let multiplier = 1;
  for (const rule of weights) {
    if (matchesRule(entry, rule)) multiplier *= rule.multiplier;
  }
  return multiplier;
}

export function filterByExclusionRules({ entries, ruleSet, winners }) {
  if (!entries) return [];

  const excludeInactive = ruleSet?.excludeInactive ?? true;
  let pool = entries;
  if (excludeInactive) {
    pool = pool.filter((e) => !e.participant || e.participant.status === 'ACTIVE');
  }

  if (!winners || winners.length === 0) return pool;

  const cross = ruleSet?.crossCategoryExclusion;
  const winnerEntryIds = new Set(winners.filter((w) => w.status === 'CONFIRMED').map((w) => w.entryId));
  const winnerParticipantIds = new Set(
    winners.filter((w) => w.status === 'CONFIRMED' && w.participantId).map((w) => w.participantId)
  );

  return pool.filter((e) => {
    if (winnerEntryIds.has(e.id)) return false;
    if (cross && e.participantId && winnerParticipantIds.has(e.participantId)) return false;
    return true;
  });
}

export function previewEligibility({ entries, ruleSet, winners }) {
  const eligible = filterByExclusionRules({ entries, ruleSet, winners });
  const byCategory = (ruleSet?.categories || []).map((c) => {
    // For MINI tier, exclude participants who already won in this category
    const winnersInCategory = winners
      .filter((w) => w.status === 'CONFIRMED' && w.prizeCategoryId === c.id)
      .map((w) => w.participantId)
      .filter(Boolean);
    const winnerSet = new Set(winnersInCategory);
    const remaining = c.tier === 'MAJOR'
      ? eligible
      : eligible.filter((e) => !e.participantId || !winnerSet.has(e.participantId));
    return {
      id: c.id,
      name: c.name,
      tier: c.tier,
      prizeCount: c.prizeCount,
      eligible: remaining.length
    };
  });
  return { totalEntries: entries.length, eligible: eligible.length, byCategory };
}

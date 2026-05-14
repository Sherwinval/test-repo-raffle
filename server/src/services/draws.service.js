import { randomBytes } from 'crypto';
import prisma from '../prisma.js';
import { getRuleSetForEvent, filterByExclusionRules, computeWeight } from './rules.service.js';

function secureRandomFloat() {
  // 53-bit precision float in [0, 1) using crypto bytes
  const bytes = randomBytes(8);
  const high = bytes.readUInt32BE(0) & 0x1fffff;
  const low = bytes.readUInt32BE(4);
  const combined = high * 0x100000000 + low;
  return combined / Math.pow(2, 53);
}

function fingerprint() {
  return randomBytes(16).toString('hex');
}

export async function loadEligiblePool(eventId, prizeCategoryId = null) {
  const ruleSet = await getRuleSetForEvent(eventId);
  const entries = await prisma.entry.findMany({
    where: { eventId },
    include: { participant: true }
  });
  const winners = await prisma.winner.findMany({ where: { eventId } });

  let pool = filterByExclusionRules({ entries, ruleSet, winners });

  if (prizeCategoryId) {
    const category = ruleSet.categories.find((c) => c.id === prizeCategoryId);
    if (category && category.tier === 'MINI') {
      const winnersInCategory = new Set(
        winners
          .filter((w) => w.status === 'CONFIRMED' && w.prizeCategoryId === prizeCategoryId)
          .map((w) => w.participantId)
          .filter(Boolean)
      );
      pool = pool.filter((e) => !e.participantId || !winnersInCategory.has(e.participantId));
    }
  }

  return { pool, ruleSet };
}

/**
 * Weighted reservoir sampling (A-ExpJ algorithm).
 * Uniform when all weights = 1; biased correctly when weights vary.
 */
export function sampleWeighted(items, weights) {
  if (items.length === 0) return null;
  if (items.length === 1) return { item: items[0], key: 0 };

  let best = null;
  let bestKey = -Infinity;
  for (let i = 0; i < items.length; i += 1) {
    const w = Math.max(0.0001, weights[i]);
    const u = secureRandomFloat();
    const key = Math.log(u) / w;
    if (key > bestKey) {
      bestKey = key;
      best = items[i];
    }
  }
  return { item: best, key: bestKey };
}

export function applyHardConstraints({ pool, ruleSet, winners, prizeCategoryId }) {
  const constraints = (ruleSet.constraints || []).filter((c) => c.type === 'HARD');
  if (constraints.length === 0) return pool;

  // Count how many winners we already have per (attribute, value) within scope
  const winnerEntries = winners
    .filter((w) => w.status === 'CONFIRMED')
    .filter((w) => !prizeCategoryId || w.prizeCategoryId === prizeCategoryId);

  // Need entry attributes for winners; we'll look them up via included entry data
  // (For simplicity assume winners include enough info on their saved snapshot.)
  return pool.filter((entry) => {
    for (const c of constraints) {
      const value = entry[c.attribute] ?? entry.participant?.[c.attribute] ?? null;
      if (!value) continue;
      const count = winnerEntries.filter((w) => {
        const wv = w.ruleSnapshot?.entryAttributes?.[c.attribute];
        return wv === value;
      }).length;
      if (count >= c.maxPerValue) return false;
    }
    return true;
  });
}

export async function drawWinner({ eventId, prizeCategoryId = null }) {
  const { pool, ruleSet } = await loadEligiblePool(eventId, prizeCategoryId);
  if (pool.length === 0) {
    const err = new Error('No eligible entries.');
    err.statusCode = 409;
    throw err;
  }

  const winners = await prisma.winner.findMany({ where: { eventId } });
  const filtered = applyHardConstraints({ pool, ruleSet, winners, prizeCategoryId });
  if (filtered.length === 0) {
    const err = new Error('All eligible entries blocked by constraints.');
    err.statusCode = 409;
    throw err;
  }

  const weights = filtered.map((e) => computeWeight(e, ruleSet.weights || []));
  const sample = sampleWeighted(filtered, weights);
  if (!sample) {
    const err = new Error('Sampling failed.');
    err.statusCode = 500;
    throw err;
  }

  return {
    entry: sample.item,
    fingerprint: fingerprint(),
    ruleSet,
    poolSize: filtered.length,
    weights: weights.length
  };
}

export async function persistWinner({ eventId, entry, fingerprint: fp, ruleSet, operator, prizeCategoryId = null }) {
  const ruleSnapshot = {
    ruleSetId: ruleSet?.id || null,
    crossCategoryExclusion: ruleSet?.crossCategoryExclusion || false,
    excludeInactive: ruleSet?.excludeInactive ?? true,
    weights: (ruleSet?.weights || []).map((w) => ({ attribute: w.attribute, operator: w.operator, value: w.value, multiplier: w.multiplier })),
    constraints: (ruleSet?.constraints || []).map((c) => ({ attribute: c.attribute, maxPerValue: c.maxPerValue, type: c.type })),
    entryAttributes: {
      department: entry.department,
      site: entry.participant?.site || null,
      role: entry.participant?.role || null
    }
  };

  return prisma.winner.create({
    data: {
      eventId,
      entryId: entry.id,
      participantId: entry.participantId || null,
      prizeCategoryId,
      operator,
      rngFingerprint: fp,
      ruleSnapshot,
      status: 'CONFIRMED'
    },
    include: {
      entry: true,
      prizeCategory: true,
      participant: true
    }
  });
}

export async function listDraws({ eventId, status, limit = 100 }) {
  const where = {};
  if (eventId) where.eventId = eventId;
  if (status) where.status = status;
  const items = await prisma.winner.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: Math.min(500, Math.max(1, limit)),
    include: {
      event: { select: { id: true, name: true } },
      entry: { select: { id: true, fullName: true, employeeId: true, entryCode: true, email: true } },
      prizeCategory: { select: { id: true, name: true, tier: true } }
    }
  });
  return { items };
}

export async function voidWinner({ id, reason, operator }) {
  if (!reason || reason.trim().length < 10) {
    const err = new Error('Reason must be at least 10 characters.');
    err.statusCode = 400;
    throw err;
  }
  return prisma.winner.update({
    where: { id },
    data: { status: 'VOIDED', voidReason: reason.trim(), voidedAt: new Date(), operator }
  });
}

export async function resetWinnersForEvent(eventId) {
  return prisma.winner.updateMany({
    where: { eventId, status: 'CONFIRMED' },
    data: { status: 'RESET' }
  });
}

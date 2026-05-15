import Event from '../models/Event.js';

const ATTRIBUTE_GETTERS = { department: (entry) => entry.department, site: (entry) => entry.participant?.site || null, role: (entry) => entry.participant?.role || null };

export async function getRuleSetForEvent(eventId) {
  const event = await Event.findById(eventId).lean();
  if (!event) return { id: null, eventId, crossCategoryExclusion: false, weightCapMultiplier: 10, excludeInactive: true, weights: [], constraints: [], categories: [] };
  const rs = event.drawRuleSet || {};
  return { id: rs._id || null, eventId, crossCategoryExclusion: !!rs.crossCategoryExclusion, weightCapMultiplier: rs.weightCapMultiplier || 10, excludeInactive: rs.excludeInactive ?? true, weights: rs.weightRules || [], constraints: rs.constraints || [], categories: event.prizeCategories || [] };
}

export async function saveRuleSetForEvent(eventId, payload) {
  const event = await Event.findById(eventId);
  if (!event) throw new Error('Event not found');
  event.drawRuleSet = {
    _id: event.drawRuleSet?._id || `rs_${eventId}`,
    crossCategoryExclusion: !!payload.crossCategoryExclusion,
    weightCapMultiplier: Math.max(1, Number(payload.weightCapMultiplier) || 10),
    excludeInactive: payload.excludeInactive ?? true,
    constraints: (payload.constraints || []).map((c, i) => ({ _id: c.id || c._id || `dc_${eventId}_${i}`, attribute: String(c.attribute || '').trim(), maxPerValue: Math.max(1, parseInt(c.maxPerValue) || 1), type: c.type === 'SOFT' ? 'SOFT' : 'HARD', categoryScope: c.categoryScope || null })).filter((c) => c.attribute),
    weightRules: (payload.weights || []).map((w, i) => ({ _id: w.id || w._id || `wr_${eventId}_${i}`, attribute: String(w.attribute || '').trim(), operator: String(w.operator || 'equals').trim(), value: String(w.value || '').trim(), multiplier: Math.min(Math.max(1, Number(payload.weightCapMultiplier) || 10), Math.max(0.1, Number(w.multiplier) || 1)) })).filter((w) => w.attribute && w.value !== ''),
    updatedAt: new Date()
  };
  event.prizeCategories = (payload.categories || []).map((cat, idx) => ({ _id: cat.id || cat._id || `pc_${eventId}_${idx}`, name: String(cat.name || '').trim() || 'Untitled category', tier: cat.tier === 'MAJOR' ? 'MAJOR' : 'MINI', prizeCount: Math.max(1, parseInt(cat.prizeCount) || 1), displayOrder: idx, prizes: cat.prizes || [] }));
  await event.save();
  return getRuleSetForEvent(eventId);
}

function getAttribute(entry, attribute) { const getter = ATTRIBUTE_GETTERS[attribute]; return getter ? getter(entry) : entry[attribute] ?? null; }
function matchesRule(entry, rule) { const actual = String(getAttribute(entry, rule.attribute) ?? '').toLowerCase(); const expected = String(rule.value ?? '').toLowerCase(); return rule.operator === 'not_equals' ? actual !== expected : actual === expected; }

export function computeWeight(entry, weights) { let multiplier = 1; for (const rule of (weights || [])) if (matchesRule(entry, rule)) multiplier *= rule.multiplier; return multiplier; }

export function filterByExclusionRules({ entries, ruleSet, winners }) {
  let pool = entries || [];
  if ((ruleSet?.excludeInactive ?? true)) pool = pool.filter((e) => !e.participant || e.participant.status === 'ACTIVE');
  const confirmed = (winners || []).filter((w) => w.status === 'CONFIRMED');
  const winnerEntryIds = new Set(confirmed.map((w) => w.entryId));
  const winnerParticipantIds = new Set(confirmed.map((w) => w.participantId).filter(Boolean));
  return pool.filter((e) => !winnerEntryIds.has(e._id || e.id) && !(ruleSet?.crossCategoryExclusion && e.participantId && winnerParticipantIds.has(e.participantId)));
}

export function previewEligibility({ entries, ruleSet, winners }) {
  const eligible = filterByExclusionRules({ entries, ruleSet, winners });
  const byCategory = (ruleSet?.categories || []).map((c) => {
    const winnerSet = new Set((winners || []).filter((w) => w.status === 'CONFIRMED' && w.prizeCategoryId === c._id).map((w) => w.participantId).filter(Boolean));
    const remaining = c.tier === 'MAJOR' ? eligible : eligible.filter((e) => !e.participantId || !winnerSet.has(e.participantId));
    return { id: c._id, name: c.name, tier: c.tier, prizeCount: c.prizeCount, eligible: remaining.length };
  });
  return { totalEntries: entries.length, eligible: eligible.length, byCategory };
}

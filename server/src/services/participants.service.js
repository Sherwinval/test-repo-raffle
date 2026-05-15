import { randomUUID } from 'crypto';
import Participant from '../models/Participant.js';
import Entry from '../models/Entry.js';

function deriveName(fullName) {
  if (!fullName) return { firstName: null, lastName: null };
  const parts = String(fullName).trim().split(/\s+/);
  return parts.length <= 1 ? { firstName: parts[0] || null, lastName: null } : { firstName: parts[0], lastName: parts.slice(1).join(' ') };
}

function buildFallbackEmail(employeeId, entryCode) {
  if (employeeId) return `${employeeId}@no-email.local`;
  if (entryCode) return `${entryCode}@no-email.local`;
  return `participant-${Date.now()}@no-email.local`;
}

export async function findOrCreateParticipantFromEntry({ employeeId, fullName, email, department, entryCode }) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  let existing = null;
  if (employeeId) existing = await Participant.findOne({ employeeId }).lean();
  if (!existing && normalizedEmail) existing = await Participant.findOne({ email: normalizedEmail }).lean();
  if (existing) return { ...existing, id: existing._id };
  const { firstName, lastName } = deriveName(fullName);
  const created = await Participant.create({ _id: randomUUID(), employeeId: employeeId || null, email: normalizedEmail || buildFallbackEmail(employeeId, entryCode), firstName, lastName, role: department || null, status: 'ACTIVE' });
  return created.toObject();
}

export async function getExcludedEmployeeIds(employeeIds) {
  if (!employeeIds?.length) return new Set();
  const found = await Participant.find({ employeeId: { $in: employeeIds.filter(Boolean) }, status: 'EXCLUDED' }).select('employeeId').lean();
  return new Set(found.map((p) => p.employeeId).filter(Boolean));
}

export async function backfillParticipantsForEvent(eventId) {
  const entries = await Entry.find({ eventId, $or: [{ participantId: null }, { participantId: '' }] }).select('_id employeeId fullName email department').lean();
  for (const entry of entries) {
    const participant = await findOrCreateParticipantFromEntry({ ...entry, entryCode: entry._id });
    if (participant) await Entry.updateOne({ _id: entry._id }, { $set: { participantId: participant._id || participant.id } });
  }
  return entries.length;
}

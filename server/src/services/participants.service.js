import prisma from '../prisma.js';

function deriveName(fullName) {
  if (!fullName) return { firstName: null, lastName: null };
  const trimmed = String(fullName).trim();
  if (!trimmed) return { firstName: null, lastName: null };
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0], lastName: null };
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
}

function buildFallbackEmail(employeeId, entryCode) {
  if (employeeId) return `${employeeId}@no-email.local`;
  if (entryCode) return `${entryCode}@no-email.local`;
  return `participant-${Date.now()}@no-email.local`;
}

export async function findOrCreateParticipantFromEntry({ employeeId, fullName, email, department, entryCode }) {
  const normalizedEmail = String(email || '').trim().toLowerCase();

  let existing = null;
  if (employeeId) {
    existing = await prisma.participant.findFirst({ where: { employeeId } });
  }
  if (!existing && normalizedEmail) {
    existing = await prisma.participant.findFirst({ where: { email: normalizedEmail } });
  }
  if (existing) return existing;

  const { firstName, lastName } = deriveName(fullName);
  return prisma.participant.create({
    data: {
      employeeId: employeeId || null,
      email: normalizedEmail || buildFallbackEmail(employeeId, entryCode),
      firstName,
      lastName,
      role: department || null,
      status: 'ACTIVE'
    }
  });
}

export async function getExcludedEmployeeIds(employeeIds) {
  if (!employeeIds || employeeIds.length === 0) return new Set();
  const found = await prisma.participant.findMany({
    where: {
      employeeId: { in: employeeIds.filter(Boolean) },
      status: 'EXCLUDED'
    },
    select: { employeeId: true }
  });
  return new Set(found.map((p) => p.employeeId).filter(Boolean));
}

export async function backfillParticipantsForEvent(eventId) {
  const entries = await prisma.entry.findMany({
    where: { eventId, participantId: null },
    select: { id: true, employeeId: true, fullName: true, email: true, department: true }
  });
  for (const entry of entries) {
    const participant = await findOrCreateParticipantFromEntry({ ...entry, entryCode: entry.id });
    if (participant) {
      await prisma.entry.update({
        where: { id: entry.id },
        data: { participantId: participant.id }
      });
    }
  }
  return entries.length;
}

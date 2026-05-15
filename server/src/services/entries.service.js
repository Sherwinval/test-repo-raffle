import { randomUUID } from 'crypto';
import prisma from '../prisma.js';
import { progressMap } from './progress.service.js';
import { getExcludedEmployeeIds } from './participants.service.js';

const QUERY_CHUNK_SIZE = 5000;
const INSERT_CHUNK_SIZE = 1500;

function deriveName(fullName) {
  if (!fullName) return { firstName: null, lastName: null };
  const trimmed = String(fullName).trim();
  if (!trimmed) return { firstName: null, lastName: null };
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0], lastName: null };
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
}

function uniqueValues(values) {
  return Array.from(new Set((values || []).filter(Boolean)));
}

function yieldToEventLoop() {
  return new Promise((resolve) => setImmediate(resolve));
}

function chunkArray(values, size) {
  const chunks = [];
  for (let start = 0; start < values.length; start += size) {
    chunks.push(values.slice(start, start + size));
  }
  return chunks;
}

export async function findExistingEntryCodes(eventId, codes) {
  const unique = uniqueValues(codes);
  if (unique.length === 0) return [];
  const existing = await Promise.all(
    chunkArray(unique, QUERY_CHUNK_SIZE).map((chunk) =>
      prisma.entry.findMany({
        where: { eventId, entryCode: { in: chunk } },
        select: { entryCode: true }
      })
    )
  );
  return existing.flat().map((r) => r.entryCode);
}

export async function findExistingEntryEmployeeIds(eventId, employeeIds) {
  const unique = uniqueValues(employeeIds);
  if (unique.length === 0) return [];
  const existing = await Promise.all(
    chunkArray(unique, QUERY_CHUNK_SIZE).map((chunk) =>
      prisma.entry.findMany({
        where: { eventId, employeeId: { in: chunk } },
        select: { employeeId: true }
      })
    )
  );
  return [...new Set(existing.flat().map((r) => r.employeeId))];
}

export async function findExistingEntryEmails(eventId, emails) {
  const unique = uniqueValues((emails || []).map((e) => String(e || '').trim().toLowerCase()).filter(Boolean));
  if (unique.length === 0) return [];
  const existing = await Promise.all(
    chunkArray(unique, QUERY_CHUNK_SIZE).map((chunk) =>
      prisma.entry.findMany({
        where: { eventId, email: { in: chunk } },
        select: { email: true }
      })
    )
  );
  return [...new Set(existing.flat().map((r) => r.email))];
}

function buildFallbackEmail(row) {
  if (row.employeeId) return `${row.employeeId}@no-email.local`;
  return `${row.entryCode || randomUUID()}@no-email.local`;
}

export function buildEntryRowsWithoutDuplicates(rows, existingCodes, existingEmployeeIds, existingEmails) {
  const existingCodeSet = new Set(existingCodes);
  const existingEmployeeIdSet = new Set(existingEmployeeIds);
  const existingEmailSet = new Set(existingEmails);
  const seenCodes = new Set();
  const seenEmployeeIds = new Set();
  const seenEmails = new Set();

  return rows.filter((row) => {
    if (existingCodeSet.has(row.entryCode)) return false;
    if (row.employeeId && existingEmployeeIdSet.has(row.employeeId)) return false;
    if (row.email && existingEmailSet.has(row.email)) return false;
    if (seenCodes.has(row.entryCode)) return false;
    if (row.employeeId && seenEmployeeIds.has(row.employeeId)) return false;
    if (row.email && seenEmails.has(row.email)) return false;

    seenCodes.add(row.entryCode);
    if (row.employeeId) seenEmployeeIds.add(row.employeeId);
    if (row.email) seenEmails.add(row.email);
    return true;
  });
}

export async function filterExcludedRows(rows) {
  const excluded = await getExcludedEmployeeIds(rows.map((r) => r.employeeId));
  const accepted = [];
  const skipped = [];
  for (const row of rows) {
    if (excluded.has(row.employeeId)) skipped.push({ ...row, reason: 'participant_excluded' });
    else accepted.push(row);
  }
  return { accepted, skipped };
}

export async function processEntryUpload(uploadId, batchId, eventId, rowsToInsert, errorRows, totalFileRows) {
  let progress = progressMap.get(uploadId);
  if (!progress) return;
  progress.status = 'saving';

  let insertedTotal = 0;
  const participantByEmployeeId = new Map();
  const participantByEmail = new Map();

  for (let start = 0; start < rowsToInsert.length; start += INSERT_CHUNK_SIZE) {
    progress = progressMap.get(uploadId);
    if (!progress || progress.status === 'canceling' || progress.status === 'canceled') {
      return;
    }

    const chunk = rowsToInsert.slice(start, start + INSERT_CHUNK_SIZE);

    const chunkEmployeeIds = uniqueValues(chunk.map((row) => row.employeeId).filter(Boolean));
    const chunkEmails = uniqueValues(chunk.map((row) => String(row.email || '').toLowerCase()).filter(Boolean));
    const employeeIdsToQuery = chunkEmployeeIds.filter((id) => !participantByEmployeeId.has(id));
    const emailsToQuery = chunkEmails.filter((email) => !participantByEmail.has(email));

    if (employeeIdsToQuery.length > 0 || emailsToQuery.length > 0) {
      const existingParticipants = await prisma.participant.findMany({
        where: {
          OR: [
            employeeIdsToQuery.length > 0 ? { employeeId: { in: employeeIdsToQuery } } : undefined,
            emailsToQuery.length > 0 ? { email: { in: emailsToQuery } } : undefined
          ].filter(Boolean)
        },
        select: {
          id: true,
          employeeId: true,
          email: true
        }
      });

      for (const participant of existingParticipants) {
        if (participant.employeeId) participantByEmployeeId.set(participant.employeeId, participant);
        if (participant.email) participantByEmail.set(String(participant.email).toLowerCase(), participant);
      }
    }

    const missingByKey = new Map();
    for (const row of chunk) {
      const emailKey = String(row.email || '').toLowerCase();
      const existing = (row.employeeId && participantByEmployeeId.get(row.employeeId)) || participantByEmail.get(emailKey);
      if (existing) continue;

      const fallbackEmail = emailKey || buildFallbackEmail(row);
      const key = row.employeeId ? `emp:${row.employeeId}` : `email:${fallbackEmail}`;
      if (!missingByKey.has(key)) {
        const { firstName, lastName } = deriveName(row.fullName);
        missingByKey.set(key, {
          employeeId: row.employeeId || null,
          email: fallbackEmail,
          firstName,
          lastName,
          role: row.department || null,
          status: 'ACTIVE'
        });
      }
    }

    if (missingByKey.size > 0) {
      await prisma.participant.createMany({
        data: Array.from(missingByKey.values()),
        skipDuplicates: true
      });

      const missingRows = Array.from(missingByKey.values());
      const createdEmployeeIds = uniqueValues(missingRows.map((row) => row.employeeId).filter(Boolean));
      const createdEmails = uniqueValues(missingRows.map((row) => row.email).filter(Boolean));
      const refreshedParticipants = await prisma.participant.findMany({
        where: {
          OR: [
            createdEmployeeIds.length > 0 ? { employeeId: { in: createdEmployeeIds } } : undefined,
            createdEmails.length > 0 ? { email: { in: createdEmails } } : undefined
          ].filter(Boolean)
        },
        select: {
          id: true,
          employeeId: true,
          email: true
        }
      });

      for (const participant of refreshedParticipants) {
        if (participant.employeeId) participantByEmployeeId.set(participant.employeeId, participant);
        if (participant.email) participantByEmail.set(String(participant.email).toLowerCase(), participant);
      }
    }

    const enriched = [];
    for (let rowIndex = 0; rowIndex < chunk.length; rowIndex += 1) {
      const row = chunk[rowIndex];
      progress = progressMap.get(uploadId);
      if (!progress || progress.status === 'canceling' || progress.status === 'canceled') {
        return;
      }
      const emailKey = String(row.email || '').toLowerCase();
      const participant = (row.employeeId && participantByEmployeeId.get(row.employeeId)) || participantByEmail.get(emailKey) || null;
      enriched.push({
        id: randomUUID(),
        eventId,
        uploadBatchId: batchId,
        employeeId: row.employeeId,
        fullName: row.fullName,
        department: row.department,
        email: row.email,
        entryCode: row.entryCode,
        participantId: participant?.id ?? null
      });

      progress.processed = Math.min(totalFileRows, start + rowIndex + 1);
      if (rowIndex % 50 === 0 || rowIndex === chunk.length - 1) {
        progressMap.set(uploadId, { ...progress });
      }
    }

    const result = await prisma.entry.createMany({ data: enriched, skipDuplicates: true });
    insertedTotal += result.count ?? 0;
    progress.processed = start + chunk.length;
    progress.inserted = insertedTotal;
    progressMap.set(uploadId, { ...progress });

    await yieldToEventLoop();
  }

  const skippedRows = totalFileRows - errorRows.length - insertedTotal;
  progress.status = 'done';
  progress.processed = totalFileRows;
  progress.inserted = insertedTotal;
  progress.skippedRows = skippedRows;
  progressMap.set(uploadId, progress);

  await prisma.uploadBatch.update({
    where: { id: batchId },
    data: {
      status: 'done',
      insertedRows: insertedTotal,
      skippedRows,
      errors: errorRows.length > 0 ? errorRows : undefined
    }
  });
}

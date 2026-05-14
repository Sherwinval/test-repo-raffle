import { randomUUID } from 'crypto';
import prisma from '../prisma.js';
import { progressMap } from './progress.service.js';
import { findOrCreateParticipantFromEntry, getExcludedEmployeeIds } from './participants.service.js';

const QUERY_CHUNK_SIZE = 5000;
const INSERT_CHUNK_SIZE = 1500;

function uniqueValues(values) {
  return Array.from(new Set((values || []).filter(Boolean)));
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
  const unique = uniqueValues(emails);
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
  const progress = progressMap.get(uploadId);
  if (!progress) return;
  progress.status = 'saving';

  let insertedTotal = 0;

  for (let start = 0; start < rowsToInsert.length; start += INSERT_CHUNK_SIZE) {
    const chunk = rowsToInsert.slice(start, start + INSERT_CHUNK_SIZE);

    const enriched = [];
    for (const row of chunk) {
      const participant = await findOrCreateParticipantFromEntry({
        employeeId: row.employeeId,
        fullName: row.fullName,
        email: row.email,
        department: row.department
      });
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
    }

    const result = await prisma.entry.createMany({ data: enriched, skipDuplicates: true });
    insertedTotal += result.count ?? 0;
    progress.processed = start + chunk.length;
    progress.inserted = insertedTotal;
    progressMap.set(uploadId, { ...progress });
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

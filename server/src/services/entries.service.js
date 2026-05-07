import { randomUUID } from 'crypto';
import prisma from '../prisma.js';
import { progressMap } from './progress.service.js';

export async function findExistingEntryCodes(eventId, codes) {
  const unique = Array.from(new Set((codes || []).filter(Boolean)));
  if (unique.length === 0) return [];
  const existing = await prisma.entry.findMany({
    where: { eventId, entryCode: { in: unique } },
    select: { entryCode: true }
  });
  return existing.map((r) => r.entryCode);
}

export async function findExistingEntryEmployeeIds(eventId, employeeIds) {
  const unique = Array.from(new Set((employeeIds || []).filter(Boolean)));
  if (unique.length === 0) return [];
  const existing = await prisma.entry.findMany({
    where: { eventId, employeeId: { in: unique } },
    select: { employeeId: true }
  });
  return [...new Set(existing.map((r) => r.employeeId))];
}

export async function findExistingEntryEmails(eventId, emails) {
  const unique = Array.from(new Set((emails || []).filter(Boolean)));
  if (unique.length === 0) return [];
  const existing = await prisma.entry.findMany({
    where: { eventId, email: { in: unique } },
    select: { email: true }
  });
  return [...new Set(existing.map((r) => r.email))];
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

export async function processEntryUpload(uploadId, batchId, eventId, rowsToInsert, errorRows, totalFileRows) {
  const progress = progressMap.get(uploadId);
  if (!progress) return;
  progress.status = 'processing';

  const chunkSize = 500;
  let insertedTotal = 0;

  for (let start = 0; start < rowsToInsert.length; start += chunkSize) {
    const chunk = rowsToInsert.slice(start, start + chunkSize);
    const mapped = chunk.map((row) => ({
      id: randomUUID(),
      eventId,
      uploadBatchId: batchId,
      employeeId: row.employeeId,
      fullName: row.fullName,
      department: row.department,
      email: row.email,
      entryCode: row.entryCode
    }));
    const result = await prisma.entry.createMany({ data: mapped, skipDuplicates: true });
    insertedTotal += result.count ?? 0;
    progress.processed = start + chunk.length;
    progress.inserted = insertedTotal;
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

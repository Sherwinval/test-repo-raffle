import { randomUUID } from 'crypto';
import prisma from '../prisma.js';
import { progressMap } from './progress.service.js';

export function mapRowsForInsert(rows, fileType) {
  return rows.map((row) => {
    return {
      id: randomUUID(),
      email: row.email,
      employeeId: row.employeeId,
      role: row.role,
      site: row.site,
      firstName: row.firstName,
      lastName: row.lastName,
      rawData: { fileType }
    };
  });
}

export async function findExistingEmails(emails) {
  const normalized = Array.from(new Set((emails || []).filter(Boolean)));
  if (normalized.length === 0) return [];

  const existing = await prisma.participant.findMany({
    where: { email: { in: normalized } },
    select: { email: true }
  });

  return existing.map((row) => row.email);
}

export async function findExistingEmployeeIds(employeeIds) {
  const normalized = Array.from(new Set((employeeIds || []).filter(Boolean)));
  if (normalized.length === 0) return [];

  const existing = await prisma.participant.findMany({
    where: { employeeId: { in: normalized } },
    select: { employeeId: true }
  });

  return existing.map((row) => row.employeeId).filter(Boolean);
}

export function buildRowsWithoutDuplicates(rows, existingDuplicateEmails, existingDuplicateEmployeeIds) {
  const existingEmails = new Set(existingDuplicateEmails);
  const existingEmployeeIds = new Set(existingDuplicateEmployeeIds);
  const seenEmails = new Set();
  const seenEmployeeIds = new Set();
  const filtered = [];

  for (const row of rows) {
    if (existingEmails.has(row.email)) continue;
    if (row.employeeId && existingEmployeeIds.has(row.employeeId)) continue;
    if (seenEmails.has(row.email)) continue;
    if (row.employeeId && seenEmployeeIds.has(row.employeeId)) continue;

    seenEmails.add(row.email);
    if (row.employeeId) seenEmployeeIds.add(row.employeeId);
    filtered.push(row);
  }

  return filtered;
}

export async function processUpload(uploadId, insertRows) {
  let progress = progressMap.get(uploadId);
  if (!progress) return;
  progress.status = 'processing';
  progress.total = insertRows.length;
  progress.duplicateCount = 0;

  const chunkSize = 1000;
  let insertedTotal = 0;

  for (let start = 0; start < insertRows.length; start += chunkSize) {
    progress = progressMap.get(uploadId);
    if (!progress || progress.status === 'canceling' || progress.status === 'canceled') {
      return;
    }
    const chunk = insertRows.slice(start, start + chunkSize);
    const result = await prisma.participant.createMany({
      data: chunk
    });
    insertedTotal += result.count ?? 0;
    progress.processed = Math.min(insertRows.length, start + chunk.length);
    progress.inserted = insertedTotal;
    progress.duplicateCount = 0;
  }

  progress.status = 'done';
  progressMap.set(uploadId, progress);
}

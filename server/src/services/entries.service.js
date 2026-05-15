import { randomUUID } from 'crypto';
import Entry from '../models/Entry.js';
import Participant from '../models/Participant.js';
import UploadBatch from '../models/UploadBatch.js';
import { progressMap } from './progress.service.js';
import { getExcludedEmployeeIds } from './participants.service.js';

const QUERY_CHUNK_SIZE = 5000;
const INSERT_CHUNK_SIZE = 1500;
const uniqueValues = (values) => Array.from(new Set((values || []).filter(Boolean)));
const chunkArray = (values, size) => Array.from({ length: Math.ceil(values.length / size) }, (_, i) => values.slice(i * size, i * size + size));
const yieldToEventLoop = () => new Promise((resolve) => setImmediate(resolve));

export async function findExistingEntryCodes(eventId, codes) {
  const unique = uniqueValues(codes); if (!unique.length) return [];
  const existing = await Promise.all(chunkArray(unique, QUERY_CHUNK_SIZE).map((chunk) => Entry.find({ eventId, entryCode: { $in: chunk } }).select('entryCode').lean()));
  return existing.flat().map((r) => r.entryCode);
}
export async function findExistingEntryEmployeeIds(eventId, employeeIds) {
  const unique = uniqueValues(employeeIds); if (!unique.length) return [];
  const existing = await Promise.all(chunkArray(unique, QUERY_CHUNK_SIZE).map((chunk) => Entry.find({ eventId, employeeId: { $in: chunk } }).select('employeeId').lean()));
  return [...new Set(existing.flat().map((r) => r.employeeId))];
}
export async function findExistingEntryEmails(eventId, emails) {
  const unique = uniqueValues((emails || []).map((e) => String(e || '').trim().toLowerCase()).filter(Boolean)); if (!unique.length) return [];
  const existing = await Promise.all(chunkArray(unique, QUERY_CHUNK_SIZE).map((chunk) => Entry.find({ eventId, email: { $in: chunk } }).select('email').lean()));
  return [...new Set(existing.flat().map((r) => r.email))];
}

function buildFallbackEmail(row) { return row.employeeId ? `${row.employeeId}@no-email.local` : `${row.entryCode || randomUUID()}@no-email.local`; }

export function buildEntryRowsWithoutDuplicates(rows, existingCodes, existingEmployeeIds, existingEmails) {
  const existingCodeSet = new Set(existingCodes); const existingEmployeeIdSet = new Set(existingEmployeeIds); const existingEmailSet = new Set(existingEmails);
  const seenCodes = new Set(); const seenEmployeeIds = new Set(); const seenEmails = new Set();
  return rows.filter((row) => { if (existingCodeSet.has(row.entryCode)) return false; if (row.employeeId && existingEmployeeIdSet.has(row.employeeId)) return false; if (row.email && existingEmailSet.has(row.email)) return false; if (seenCodes.has(row.entryCode)) return false; if (row.employeeId && seenEmployeeIds.has(row.employeeId)) return false; if (row.email && seenEmails.has(row.email)) return false; seenCodes.add(row.entryCode); if (row.employeeId) seenEmployeeIds.add(row.employeeId); if (row.email) seenEmails.add(row.email); return true; });
}

export async function filterExcludedRows(rows) { const excluded = await getExcludedEmployeeIds(rows.map((r) => r.employeeId)); return { accepted: rows.filter((r) => !excluded.has(r.employeeId)), skipped: rows.filter((r) => excluded.has(r.employeeId)).map((r) => ({ ...r, reason: 'participant_excluded' })) }; }

export async function processEntryUpload(uploadId, batchId, eventId, rowsToInsert, errorRows, totalFileRows) {
  let progress = progressMap.get(uploadId); if (!progress) return; progress.status = 'saving';
  let insertedTotal = 0; const participantByEmployeeId = new Map(); const participantByEmail = new Map();

  for (let start = 0; start < rowsToInsert.length; start += INSERT_CHUNK_SIZE) {
    progress = progressMap.get(uploadId); if (!progress || progress.status === 'canceling' || progress.status === 'canceled') return;
    const chunk = rowsToInsert.slice(start, start + INSERT_CHUNK_SIZE);
    const chunkEmployeeIds = uniqueValues(chunk.map((row) => row.employeeId).filter(Boolean));
    const chunkEmails = uniqueValues(chunk.map((row) => String(row.email || '').toLowerCase()).filter(Boolean));

    const existingParticipants = await Participant.find({ $or: [{ employeeId: { $in: chunkEmployeeIds } }, { email: { $in: chunkEmails } }] }).select('_id employeeId email').lean();
    for (const p of existingParticipants) { if (p.employeeId) participantByEmployeeId.set(p.employeeId, p); if (p.email) participantByEmail.set(String(p.email).toLowerCase(), p); }

    const missing = [];
    for (const row of chunk) {
      const emailKey = String(row.email || '').toLowerCase();
      if ((row.employeeId && participantByEmployeeId.get(row.employeeId)) || participantByEmail.get(emailKey)) continue;
      missing.push({ _id: randomUUID(), employeeId: row.employeeId || null, email: emailKey || buildFallbackEmail(row), firstName: (row.fullName || '').split(/\s+/)[0] || null, lastName: (row.fullName || '').split(/\s+/).slice(1).join(' ') || null, role: row.department || null, status: 'ACTIVE' });
    }
    if (missing.length) await Participant.insertMany(missing, { ordered: false }).catch(() => {});

    const refreshed = await Participant.find({ $or: [{ employeeId: { $in: chunkEmployeeIds } }, { email: { $in: chunkEmails } }] }).select('_id employeeId email').lean();
    for (const p of refreshed) { if (p.employeeId) participantByEmployeeId.set(p.employeeId, p); if (p.email) participantByEmail.set(String(p.email).toLowerCase(), p); }

    const enriched = chunk.map((row) => ({ _id: randomUUID(), eventId, uploadBatchId: batchId, employeeId: row.employeeId, fullName: row.fullName, department: row.department, email: row.email, entryCode: row.entryCode, participantId: ((row.employeeId && participantByEmployeeId.get(row.employeeId)) || participantByEmail.get(String(row.email || '').toLowerCase()) || {})._id || null }));
    await Entry.insertMany(enriched, { ordered: false }).then((r) => { insertedTotal += r.length; }).catch((e) => { insertedTotal += e?.insertedDocs?.length || 0; });

    progress.processed = start + chunk.length; progress.inserted = insertedTotal; progressMap.set(uploadId, { ...progress });
    await yieldToEventLoop();
  }

  const skippedRows = totalFileRows - errorRows.length - insertedTotal;
  progressMap.set(uploadId, { ...progress, status: 'done', processed: totalFileRows, inserted: insertedTotal, skippedRows });
  await UploadBatch.updateOne({ _id: batchId }, { $set: { status: 'done', insertedRows: insertedTotal, skippedRows, errors: errorRows.length ? errorRows : [] } });
}

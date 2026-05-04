import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { randomUUID } from 'crypto';
import dotenv from 'dotenv';
import prisma from './prisma.js';
import { parseFileBuffer } from './utils/parseFile.js';

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 5000);
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

const progressMap = new Map();

app.use(cors());
app.use(express.json());

app.post('/api/upload', upload.single('file'), async (req, res) => {
  const file = req.file;
  if (!file) {
    return res.status(400).json({ error: 'No file uploaded.' });
  }

  const extension = file.originalname.split('.').pop()?.toLowerCase();
  if (!extension || !['csv', 'xls', 'xlsx'].includes(extension)) {
    return res.status(400).json({ error: 'Unsupported file format. Use CSV, XLS, or XLSX.' });
  }

  const uploadId = randomUUID();
  const rows = parseFileBuffer(file.buffer, extension);
  const incompleteRows = findIncompleteRows(rows);
  const insertRows = mapRowsForInsert(rows, extension);
  const fileDuplicateEmails = findDuplicateValues(insertRows.map((row) => row.email));
  const fileDuplicateEmployeeIds = findDuplicateValues(insertRows.map((row) => row.employeeId));
  const existingDuplicateEmails = await findExistingEmails(insertRows.map((row) => row.email));
  const existingDuplicateEmployeeIds = await findExistingEmployeeIds(insertRows.map((row) => row.employeeId));
  const fileDuplicateCount = fileDuplicateEmails.length + fileDuplicateEmployeeIds.length;
  const existingDuplicateCount = existingDuplicateEmails.length + existingDuplicateEmployeeIds.length;
  const duplicateCount = fileDuplicateCount + existingDuplicateCount;
  const duplicateMode = String(req.body?.duplicateMode || '').toLowerCase();
  const uploadWithDuplicates = duplicateMode === 'with';
  const uploadWithoutDuplicates = duplicateMode === 'without';

  if (incompleteRows.length > 0) {
    return res.status(400).json({
      error: `Upload blocked: ${incompleteRows.length} row(s) have missing required fields (email, employeeId, firstName, lastName, role, site).`,
      incompleteRows: incompleteRows.slice(0, 20)
    });
  }

  if (duplicateCount > 0 && !uploadWithDuplicates && !uploadWithoutDuplicates) {
    return res.status(409).json({
      error: `Duplicates found. Please confirm before upload.`,
      totalRows: rows.length,
      fileDuplicateCount,
      existingDuplicateCount,
      duplicateCount,
      duplicateEmails: fileDuplicateEmails,
      duplicateEmployeeIds: fileDuplicateEmployeeIds,
      existingDuplicateEmails,
      existingDuplicateEmployeeIds
    });
  }

  progressMap.set(uploadId, {
    status: 'pending',
    processed: 0,
    inserted: 0,
    duplicateCount: 0
  });

  const rowsToInsert = uploadWithDuplicates
    ? insertRows
    : buildRowsWithoutDuplicates(insertRows, existingDuplicateEmails, existingDuplicateEmployeeIds);

  processUpload(uploadId, rowsToInsert).catch((error) => {
    const detailedMessage = formatUploadError(error);
    progressMap.set(uploadId, {
      status: 'error',
      processed: 0,
      inserted: 0,
      duplicateCount: 0,
      error: detailedMessage
    });
  });

  res.status(202).json({ uploadId });
});

app.post('/api/upload/validate', upload.single('file'), async (req, res) => {
  const file = req.file;
  if (!file) {
    return res.status(400).json({ error: 'No file uploaded.' });
  }

  const extension = file.originalname.split('.').pop()?.toLowerCase();
  if (!extension || !['csv', 'xls', 'xlsx'].includes(extension)) {
    return res.status(400).json({ error: 'Unsupported file format. Use CSV, XLS, or XLSX.' });
  }

  const rows = parseFileBuffer(file.buffer, extension);
  const incompleteRows = findIncompleteRows(rows);

  if (incompleteRows.length > 0) {
    return res.status(400).json({
      error: `Validation failed: ${incompleteRows.length} row(s) have missing required fields (email, employeeId, firstName, lastName, role, site).`,
      incompleteRows: incompleteRows.slice(0, 20)
    });
  }

  const insertRows = mapRowsForInsert(rows, extension);
  const fileDuplicateEmails = findDuplicateValues(insertRows.map((row) => row.email));
  const fileDuplicateEmployeeIds = findDuplicateValues(insertRows.map((row) => row.employeeId));
  const existingDuplicateEmails = await findExistingEmails(insertRows.map((row) => row.email));
  const existingDuplicateEmployeeIds = await findExistingEmployeeIds(insertRows.map((row) => row.employeeId));
  const fileDuplicateCount = fileDuplicateEmails.length + fileDuplicateEmployeeIds.length;
  const existingDuplicateCount = existingDuplicateEmails.length + existingDuplicateEmployeeIds.length;

  res.json({
    totalRows: rows.length,
    fileDuplicateCount,
    existingDuplicateCount,
    duplicateCount: fileDuplicateCount + existingDuplicateCount,
    uniqueRows: insertRows.length,
    duplicateEmails: fileDuplicateEmails,
    duplicateEmployeeIds: fileDuplicateEmployeeIds,
    existingDuplicateEmails,
    existingDuplicateEmployeeIds
  });
});

app.get('/api/upload/progress/:uploadId', (req, res) => {
  const uploadId = req.params.uploadId;
  const progress = progressMap.get(uploadId);
  if (!progress) {
    return res.status(404).json({ error: 'Upload ID not found.' });
  }
  res.json(progress);
});

app.get('/api/participants/stats', async (_req, res) => {
  try {
    const count = await prisma.participant.count();
    res.json({ totalParticipants: count });
  } catch (err) {
    console.error('Stats query failed:', err);
    res.status(500).json({ error: 'Failed to fetch stats.' });
  }
});

// --- Events ---

app.get('/api/events', async (_req, res) => {
  try {
    const events = await prisma.event.findMany({
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, createdAt: true }
    });
    res.json(events);
  } catch (err) {
    console.error('Events query failed:', err);
    res.status(500).json({ error: 'Failed to fetch events.' });
  }
});

app.post('/api/events', async (req, res) => {
  const name = String(req.body?.name || '').trim();
  if (!name) return res.status(400).json({ error: 'Event name is required.' });
  try {
    const event = await prisma.event.create({ data: { name } });
    res.status(201).json(event);
  } catch (err) {
    console.error('Event create failed:', err);
    res.status(500).json({ error: 'Failed to create event.' });
  }
});

app.delete('/api/events/:eventId', async (req, res) => {
  const { eventId } = req.params;
  try {
    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) return res.status(404).json({ error: 'Event not found.' });
    // Delete in FK order: entries first, then batches, then event
    await prisma.entry.deleteMany({ where: { eventId } });
    await prisma.uploadBatch.deleteMany({ where: { eventId } });
    await prisma.event.delete({ where: { id: eventId } });
    res.json({ deleted: true });
  } catch (err) {
    console.error('Event delete failed:', err);
    res.status(500).json({ error: 'Failed to delete event.' });
  }
});

// --- Entry Upload ---

app.post('/api/events/:eventId/entries/upload', upload.single('file'), async (req, res) => {
  const { eventId } = req.params;
  const file = req.file;

  if (!file) return res.status(400).json({ error: 'No file uploaded.' });

  const ext = file.originalname.split('.').pop()?.toLowerCase();
  if (!['csv', 'xls', 'xlsx'].includes(ext)) {
    return res.status(400).json({ error: 'Unsupported file format. Use CSV, XLS, or XLSX.' });
  }

  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) return res.status(404).json({ error: 'Event not found.' });

  const rows = parseFileBuffer(file.buffer, ext);
  if (rows.length === 0) return res.status(400).json({ error: 'File is empty.' });

  const firstRow = rows[0];
  const missingCols = ['employeeId', 'fullName', 'department', 'email', 'entryCode'].filter(
    (col) => firstRow[col] === undefined
  );
  if (missingCols.length > 0) {
    return res.status(400).json({
      error: `Missing required columns: ${missingCols.join(', ')}. Download the template for the correct format.`
    });
  }

  const incompleteRows = findEntryIncompleteRows(rows);
  const incompleteSet = new Set(incompleteRows.map((r) => r.rowNumber));
  const completeRows = rows.filter((r) => !incompleteSet.has(r.rowNumber));

  const fileDuplicateCodes = findDuplicateValues(completeRows.map((r) => r.entryCode));
  const fileDuplicateEmployeeIds = findDuplicateValues(completeRows.map((r) => r.employeeId));
  const fileDuplicateEmails = findDuplicateValues(completeRows.map((r) => r.email));

  const [existingCodes, existingEmployeeIds, existingEmails] = await Promise.all([
    findExistingEntryCodes(eventId, completeRows.map((r) => r.entryCode)),
    findExistingEntryEmployeeIds(eventId, completeRows.map((r) => r.employeeId)),
    findExistingEntryEmails(eventId, completeRows.map((r) => r.email))
  ]);

  const fileDuplicateCount = fileDuplicateCodes.length + fileDuplicateEmployeeIds.length + fileDuplicateEmails.length;
  const existingDuplicateCount = existingCodes.length + existingEmployeeIds.length + existingEmails.length;
  const duplicateCount = fileDuplicateCount + existingDuplicateCount;

  const duplicateMode = String(req.body?.duplicateMode || '').toLowerCase();
  const uploadWithDuplicates = duplicateMode === 'with';
  const uploadWithoutDuplicates = duplicateMode === 'without';

  if (duplicateCount > 0 && !uploadWithDuplicates && !uploadWithoutDuplicates) {
    return res.status(409).json({
      error: 'Duplicates found. Please confirm before upload.',
      totalRows: rows.length,
      fileDuplicateCount,
      existingDuplicateCount,
      duplicateCount
    });
  }

  const batch = await prisma.uploadBatch.create({
    data: { eventId, status: 'processing', totalRows: rows.length }
  });

  const uploadId = randomUUID();
  const rowsToInsert = uploadWithDuplicates
    ? completeRows
    : buildEntryRowsWithoutDuplicates(completeRows, existingCodes, existingEmployeeIds, existingEmails);

  progressMap.set(uploadId, {
    status: 'pending',
    total: rows.length,
    processed: 0,
    inserted: 0,
    skippedRows: rows.length - rowsToInsert.length - incompleteRows.length,
    duplicatesDetected: duplicateCount,
    uploadMode: duplicateMode || 'none',
    errors: incompleteRows
  });

  processEntryUpload(uploadId, batch.id, eventId, rowsToInsert, incompleteRows, rows.length).catch((err) => {
    const msg = formatUploadError(err);
    const current = progressMap.get(uploadId) ?? {};
    progressMap.set(uploadId, { ...current, status: 'error', error: msg });
  });

  res.status(202).json({ uploadId });
});

app.get('/api/events/:eventId/entries/stats', async (req, res) => {
  const { eventId } = req.params;
  try {
    const count = await prisma.entry.count({ where: { eventId } });
    res.json({ totalEntries: count });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch entry stats.' });
  }
});

app.get('/api/events/:eventId/entries', async (req, res) => {
  const { eventId } = req.params;
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize) || 50));
  const search = String(req.query.search || '').trim();
  const department = String(req.query.department || '').trim();

  try {
    const where = {
      eventId,
      ...(department ? { department } : {}),
      ...(search ? {
        OR: [
          { employeeId: { contains: search, mode: 'insensitive' } },
          { fullName: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { entryCode: { contains: search, mode: 'insensitive' } }
        ]
      } : {})
    };

    const [entries, total, deptRows] = await Promise.all([
      prisma.entry.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: { id: true, employeeId: true, fullName: true, department: true, email: true, entryCode: true, createdAt: true }
      }),
      prisma.entry.count({ where }),
      prisma.entry.findMany({
        where: { eventId },
        select: { department: true },
        distinct: ['department'],
        orderBy: { department: 'asc' }
      })
    ]);

    res.json({
      entries,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      departments: deptRows.map((r) => r.department)
    });
  } catch (err) {
    console.error('Entries list failed:', err);
    res.status(500).json({ error: 'Failed to fetch entries.' });
  }
});

app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});

async function processUpload(uploadId, insertRows) {
  const progress = progressMap.get(uploadId);
  if (!progress) return;
  progress.status = 'processing';
  progress.total = insertRows.length;
  progress.duplicateCount = 0;

  const chunkSize = 1000;
  let insertedTotal = 0;

  for (let start = 0; start < insertRows.length; start += chunkSize) {
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

function mapRowsForInsert(rows, fileType) {
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

function findDuplicateValues(values) {
  const seen = new Set();
  const duplicates = new Set();

  for (const value of values) {
    if (!value) continue;
    if (seen.has(value)) {
      duplicates.add(value);
    } else {
      seen.add(value);
    }
  }

  return Array.from(duplicates);
}

function findIncompleteRows(rows) {
  const requiredFields = ['email', 'employeeId', 'firstName', 'lastName', 'role', 'site'];
  const missingByRow = [];

  for (const row of rows) {
    const missingFields = requiredFields.filter((field) => {
      const value = row[field];
      return typeof value !== 'string' || value.trim() === '';
    });

    if (missingFields.length > 0) {
      missingByRow.push({
        rowNumber: row.rowNumber,
        missingFields
      });
    }
  }

  return missingByRow;
}

async function findExistingEmails(emails) {
  const normalized = Array.from(new Set((emails || []).filter(Boolean)));
  if (normalized.length === 0) return [];

  const existing = await prisma.participant.findMany({
    where: { email: { in: normalized } },
    select: { email: true }
  });

  return existing.map((row) => row.email);
}

async function findExistingEmployeeIds(employeeIds) {
  const normalized = Array.from(new Set((employeeIds || []).filter(Boolean)));
  if (normalized.length === 0) return [];

  const existing = await prisma.participant.findMany({
    where: { employeeId: { in: normalized } },
    select: { employeeId: true }
  });

  return existing.map((row) => row.employeeId).filter(Boolean);
}

function buildRowsWithoutDuplicates(rows, existingDuplicateEmails, existingDuplicateEmployeeIds) {
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

function formatUploadError(error) {
  if (!(error instanceof Error)) return String(error);

  const code = error.code ? ` code=${error.code}` : '';
  const meta = error.meta ? ` meta=${JSON.stringify(error.meta)}` : '';
  const message = error.message ? error.message.replace(/\s+/g, ' ').trim() : 'Unknown error';

  return `${message}${code}${meta}`;
}

async function processEntryUpload(uploadId, batchId, eventId, rowsToInsert, errorRows, totalFileRows) {
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

function findEntryIncompleteRows(rows) {
  const required = ['employeeId', 'fullName', 'department', 'email', 'entryCode'];
  return rows
    .map((row) => {
      const missingFields = required.filter((f) => {
        const v = row[f];
        return typeof v !== 'string' || v.trim() === '';
      });
      return missingFields.length > 0 ? { rowNumber: row.rowNumber, missingFields } : null;
    })
    .filter(Boolean);
}

async function findExistingEntryCodes(eventId, codes) {
  const unique = Array.from(new Set((codes || []).filter(Boolean)));
  if (unique.length === 0) return [];
  const existing = await prisma.entry.findMany({
    where: { eventId, entryCode: { in: unique } },
    select: { entryCode: true }
  });
  return existing.map((r) => r.entryCode);
}

async function findExistingEntryEmployeeIds(eventId, employeeIds) {
  const unique = Array.from(new Set((employeeIds || []).filter(Boolean)));
  if (unique.length === 0) return [];
  const existing = await prisma.entry.findMany({
    where: { eventId, employeeId: { in: unique } },
    select: { employeeId: true }
  });
  return [...new Set(existing.map((r) => r.employeeId))];
}

async function findExistingEntryEmails(eventId, emails) {
  const unique = Array.from(new Set((emails || []).filter(Boolean)));
  if (unique.length === 0) return [];
  const existing = await prisma.entry.findMany({
    where: { eventId, email: { in: unique } },
    select: { email: true }
  });
  return [...new Set(existing.map((r) => r.email))];
}

function buildEntryRowsWithoutDuplicates(rows, existingCodes, existingEmployeeIds, existingEmails) {
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

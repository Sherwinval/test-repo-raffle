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

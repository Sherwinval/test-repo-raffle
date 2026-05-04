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
  progressMap.set(uploadId, {
    status: 'pending',
    processed: 0,
    inserted: 0,
    duplicateCount: 0
  });

  processUpload(uploadId, file.buffer, extension).catch((error) => {
    progressMap.set(uploadId, {
      status: 'error',
      processed: 0,
      inserted: 0,
      duplicateCount: 0,
      error: error instanceof Error ? error.message : String(error)
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
  const uniqueRows = dedupeRows(rows);
  const duplicateEmails = findDuplicateEmails(rows);

  res.json({
    totalRows: rows.length,
    duplicateCount: rows.length - uniqueRows.length,
    uniqueRows: uniqueRows.length,
    duplicateEmails
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

async function processUpload(uploadId, buffer, extension) {
  const progress = progressMap.get(uploadId);
  if (!progress) return;
  progress.status = 'processing';

  const rows = parseFileBuffer(buffer, extension);
  progress.total = rows.length;

  const uniqueRows = dedupeRows(rows);
  progress.duplicateCount = rows.length - uniqueRows.length;

  const chunkSize = 1000;
  let insertedTotal = 0;

  for (let start = 0; start < uniqueRows.length; start += chunkSize) {
    const chunk = uniqueRows.slice(start, start + chunkSize);
    const result = await prisma.participant.createMany({
      data: chunk,
      skipDuplicates: true
    });
    insertedTotal += result.count ?? 0;
    progress.processed = Math.min(uniqueRows.length, start + chunk.length);
    progress.inserted = insertedTotal;
  }

  progress.status = 'done';
  progressMap.set(uploadId, progress);
}

function findDuplicateEmails(rows) {
  const seenEmails = new Set();
  const duplicates = new Set();

  for (const row of rows) {
    if (!row.email) continue;
    if (seenEmails.has(row.email)) {
      duplicates.add(row.email);
    } else {
      seenEmails.add(row.email);
    }
  }

  return Array.from(duplicates);
}

function dedupeRows(rows) {
  const seenEmails = new Set();
  const unique = [];

  for (const row of rows) {
    if (!row.email) continue;
    if (seenEmails.has(row.email)) continue;
    seenEmails.add(row.email);
    unique.push({
      email: row.email,
      employeeId: row.employeeId,
      role: row.role,
      site: row.site,
      firstName: row.firstName,
      lastName: row.lastName,
      rawData: row.rawData
    });
  }

  return unique;
}

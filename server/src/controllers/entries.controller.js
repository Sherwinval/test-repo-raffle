import { randomUUID } from 'crypto';
import prisma from '../prisma.js';
import { parseFileBuffer } from '../utils/parseFile.js';
import { findDuplicateValues, findEntryIncompleteRows } from '../utils/duplicates.js';
import { formatUploadError } from '../utils/errors.js';
import { progressMap } from '../services/progress.service.js';
import {
  findExistingEntryCodes,
  findExistingEntryEmployeeIds,
  findExistingEntryEmails,
  buildEntryRowsWithoutDuplicates,
  processEntryUpload
} from '../services/entries.service.js';

export async function uploadEntries(req, res) {
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
}

export async function createEntry(req, res) {
  const { eventId } = req.params;
  const {
    employeeId: rawEmployeeId,
    fullName: rawFullName,
    department: rawDepartment,
    email: rawEmail,
    entryCode: rawEntryCode
  } = req.body;

  const employeeId = String(rawEmployeeId || '').trim();
  const fullName = String(rawFullName || '').trim();
  const department = String(rawDepartment || '').trim();
  const email = String(rawEmail || '').trim();
  const entryCode = String(rawEntryCode || '').trim();

  // Validate required fields
  if (!employeeId || !fullName || !department || !email || !entryCode) {
    return res.status(400).json({ error: 'All fields are required: employeeId, fullName, department, email, entryCode.' });
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email format.' });
  }

  try {
    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) return res.status(404).json({ error: 'Event not found.' });

    // Check for duplicates
    const existing = await prisma.entry.findFirst({
      where: {
        eventId,
        OR: [
          { entryCode },
          { employeeId },
          { email }
        ]
      }
    });

    if (existing) {
      const duplicateField = existing.entryCode === entryCode ? 'entryCode' :
                            existing.employeeId === employeeId ? 'employeeId' : 'email';
      return res.status(409).json({
        error: `An entry with this ${duplicateField} already exists.`,
        duplicateField
      });
    }

    // Manual entries still require an upload batch because uploadBatchId is mandatory.
    const manualBatch = await prisma.uploadBatch.create({
      data: {
        eventId,
        status: 'completed',
        totalRows: 1,
        insertedRows: 1,
        skippedRows: 0,
        errors: []
      }
    });

    // Create the entry
    const entry = await prisma.entry.create({
      data: {
        eventId,
        uploadBatchId: manualBatch.id,
        employeeId,
        fullName,
        department,
        email,
        entryCode
      }
    });

    res.status(201).json(entry);
  } catch (err) {
    console.error('Create entry failed:', err);
    res.status(500).json({ error: 'Failed to create entry.' });
  }
}

export async function getEntryStats(req, res) {
  const { eventId } = req.params;
  try {
    const count = await prisma.entry.count({ where: { eventId } });
    res.json({ totalEntries: count });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch entry stats.' });
  }
}

export async function listEntries(req, res) {
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
}

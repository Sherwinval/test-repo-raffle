import { randomUUID } from 'crypto';
import prisma from '../prisma.js';
import { parseFileBuffer } from '../utils/parseFile.js';
import { findDuplicateValues } from '../utils/duplicates.js';
import { formatUploadError } from '../utils/errors.js';
import { progressMap, uploadContextMap } from '../services/progress.service.js';
import { appendAuditLog } from '../services/audit.service.js';
import {
  findExistingEntryCodes,
  findExistingEntryEmployeeIds,
  findExistingEntryEmails,
  buildEntryRowsWithoutDuplicates,
  processEntryUpload
} from '../services/entries.service.js';

const REQUIRED_ENTRY_FIELDS = ['employeeId', 'fullName', 'department', 'email', 'entryCode'];
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function cleanEntryRow(row) {
  return {
    rowNumber: row.rowNumber,
    employeeId: String(row.employeeId ?? '').trim(),
    fullName: String(row.fullName ?? '').trim(),
    department: String(row.department ?? '').trim(),
    email: String(row.email ?? '').trim().toLowerCase(),
    entryCode: String(row.entryCode ?? '').trim()
  };
}

function validateEntryRow(row) {
  const cleaned = cleanEntryRow(row);
  const issues = [];
  const missingFields = REQUIRED_ENTRY_FIELDS.filter((field) => !cleaned[field]);

  if (missingFields.length > 0) {
    issues.push(`Missing ${missingFields.join(', ')}`);
  }
  if (cleaned.employeeId && !/^\d{7}$/.test(cleaned.employeeId)) {
    issues.push('Employee ID must be exactly 7 digits');
  }
  if (cleaned.email && !EMAIL_PATTERN.test(cleaned.email)) {
    issues.push('Email must be a valid email address');
  }

  return { ...cleaned, issues, missingFields };
}

function splitValidAndInvalidRows(rows) {
  const validRows = [];
  const invalidRows = [];

  for (const row of rows) {
    if (row.__forceKeep) {
      validRows.push(cleanEntryRow(row));
      continue;
    }
    const reviewed = validateEntryRow(row);
    if (reviewed.issues.length > 0) invalidRows.push(reviewed);
    else validRows.push(reviewed);
  }

  return { validRows, invalidRows };
}

async function continueEntryUpload({ uploadId, eventId, rows, duplicateMode, reviewErrors = [] }) {
  const { validRows, invalidRows } = splitValidAndInvalidRows(rows);

  if (invalidRows.length > 0) {
    uploadContextMap.set(uploadId, { eventId, rows, duplicateMode, reviewErrors });
    progressMap.set(uploadId, {
      ...progressMap.get(uploadId),
      status: 'needs-review',
      total: rows.length,
      processed: 0,
      inserted: 0,
      invalidRows,
      invalidRowCount: invalidRows.length,
      error: `${invalidRows.length} row(s) need review before saving.`
    });
    return;
  }

  const fileDuplicateCodes = findDuplicateValues(validRows.map((r) => r.entryCode));
  const fileDuplicateEmployeeIds = findDuplicateValues(validRows.map((r) => r.employeeId));
  const fileDuplicateEmails = findDuplicateValues(validRows.map((r) => r.email));

  const [existingCodes, existingEmployeeIds, existingEmails] = await Promise.all([
    findExistingEntryCodes(eventId, validRows.map((r) => r.entryCode)),
    findExistingEntryEmployeeIds(eventId, validRows.map((r) => r.employeeId)),
    findExistingEntryEmails(eventId, validRows.map((r) => r.email))
  ]);

  const fileDuplicateCount = fileDuplicateCodes.length + fileDuplicateEmployeeIds.length + fileDuplicateEmails.length;
  const existingDuplicateCount = existingCodes.length + existingEmployeeIds.length + existingEmails.length;
  const duplicateCount = fileDuplicateCount + existingDuplicateCount;

  const uploadWithDuplicates = duplicateMode === 'with';
  const uploadWithoutDuplicates = duplicateMode === 'without';

  if (duplicateCount > 0 && !uploadWithDuplicates && !uploadWithoutDuplicates) {
    await appendAuditLog({
      eventId,
      action: 'deduplication_review_required',
      details: {
        uploadId,
        totalRows: rows.length,
        fileDuplicateCount,
        existingDuplicateCount,
        duplicateCount
      }
    });
    progressMap.set(uploadId, {
      ...progressMap.get(uploadId),
      status: 'duplicate-confirmation',
      totalRows: rows.length,
      fileDuplicateCount,
      existingDuplicateCount,
      duplicateCount,
      duplicatesDetected: duplicateCount
    });
    return;
  }

  const batch = await prisma.uploadBatch.create({
    data: { eventId, status: 'processing', totalRows: rows.length }
  });

  const rowsToInsert = uploadWithDuplicates
    ? validRows
    : buildEntryRowsWithoutDuplicates(validRows, existingCodes, existingEmployeeIds, existingEmails);

  await appendAuditLog({
    eventId,
    action: duplicateCount > 0 ? 'deduplication_run' : 'entry_upload_validated',
    details: {
      uploadId,
      batchId: batch.id,
      duplicateMode: duplicateMode || 'none',
      totalRows: rows.length,
      rowsToInsert: rowsToInsert.length,
      skippedRows: rows.length - rowsToInsert.length,
      fileDuplicateCount,
      existingDuplicateCount,
      duplicateCount
    }
  });

  progressMap.set(uploadId, {
    ...progressMap.get(uploadId),
    status: 'saving',
    total: rows.length,
    processed: 0,
    inserted: 0,
    skippedRows: rows.length - rowsToInsert.length,
    duplicatesDetected: duplicateCount,
    uploadMode: duplicateMode || 'none',
    errors: reviewErrors
  });

  await processEntryUpload(uploadId, batch.id, eventId, rowsToInsert, [], rows.length);
  const doneProgress = progressMap.get(uploadId) || {};
  await appendAuditLog({
    eventId,
    action: 'entry_upload_completed',
    details: {
      uploadId,
      batchId: batch.id,
      totalRows: rows.length,
      insertedRows: doneProgress.inserted ?? rowsToInsert.length,
      skippedRows: doneProgress.skippedRows ?? rows.length - rowsToInsert.length
    }
  });
  uploadContextMap.delete(uploadId);
}

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

  const uploadId = randomUUID();
  const duplicateMode = String(req.body?.duplicateMode || '').toLowerCase();

  progressMap.set(uploadId, {
    status: 'parsing',
    total: 0,
    processed: 0,
    inserted: 0,
    skippedRows: 0,
    duplicatesDetected: 0,
    uploadMode: duplicateMode || 'none',
    errors: []
  });

  await appendAuditLog({
    eventId,
    action: 'entry_upload_started',
    operator: req.body?.operator,
    details: {
      uploadId,
      fileName: file.originalname,
      duplicateMode: duplicateMode || 'none'
    }
  });

  res.status(202).json({ uploadId });

  setImmediate(async () => {
    try {
      const rows = parseFileBuffer(file.buffer, ext);
      if (rows.length === 0) {
        progressMap.set(uploadId, {
          ...progressMap.get(uploadId),
          status: 'error',
          error: 'File is empty.'
        });
        return;
      }

      const parsingProgress = progressMap.get(uploadId) ?? {};
      progressMap.set(uploadId, {
        ...parsingProgress,
        status: 'validating',
        total: rows.length
      });

      const firstRow = rows[0];
      const missingCols = ['employeeId', 'fullName', 'department', 'email', 'entryCode'].filter(
        (col) => firstRow[col] === undefined
      );
      if (missingCols.length > 0) {
        progressMap.set(uploadId, {
          ...progressMap.get(uploadId),
          status: 'error',
          error: `Missing required columns: ${missingCols.join(', ')}. Download the template for the correct format.`
        });
        return;
      }

      await continueEntryUpload({ uploadId, eventId, rows, duplicateMode });
    } catch (err) {
      const msg = formatUploadError(err);
      const current = progressMap.get(uploadId) ?? {};
      progressMap.set(uploadId, { ...current, status: 'error', error: msg });
    }
  });
}

export async function resolveUploadIssues(req, res) {
  const { uploadId } = req.params;
  const context = uploadContextMap.get(uploadId);

  if (!context) return res.status(404).json({ error: 'Upload review session not found.' });

  const decisions = Array.isArray(req.body?.rows) ? req.body.rows : [];
  const decisionMap = new Map(decisions.map((row) => [Number(row.rowNumber), row]));
  const resolvedRows = [];
  const reviewErrors = [];

  for (const row of context.rows) {
    const decision = decisionMap.get(Number(row.rowNumber));
    if (!decision) {
      resolvedRows.push(row);
      continue;
    }

    if (decision.action === 'delete') {
      reviewErrors.push({
        rowNumber: row.rowNumber,
        missingFields: [],
        action: 'deleted',
        issues: decision.issues || []
      });
      continue;
    }

    const nextRow = decision.action === 'edit' || decision.action === 'keep'
      ? { ...cleanEntryRow({ ...row, ...decision }), __forceKeep: decision.action === 'keep' }
      : row;

    resolvedRows.push(nextRow);
    if (decision.action === 'keep') {
      reviewErrors.push({
        rowNumber: row.rowNumber,
        missingFields: decision.missingFields || [],
        action: 'kept',
        issues: decision.issues || []
      });
    }
  }

  progressMap.set(uploadId, {
    ...progressMap.get(uploadId),
    status: 'validating',
    invalidRows: [],
    invalidRowCount: 0,
    error: undefined
  });

  setImmediate(async () => {
    try {
      await continueEntryUpload({
        uploadId,
        eventId: context.eventId,
        rows: resolvedRows,
        duplicateMode: context.duplicateMode,
        reviewErrors
      });
    } catch (err) {
      const msg = formatUploadError(err);
      const current = progressMap.get(uploadId) ?? {};
      progressMap.set(uploadId, { ...current, status: 'error', error: msg });
    }
  });

  res.json(progressMap.get(uploadId));
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

    await appendAuditLog({
      eventId,
      action: 'manual_entry_added',
      operator: req.body?.operator,
      details: {
        entryId: entry.id,
        employeeId: entry.employeeId,
        fullName: entry.fullName,
        entryCode: entry.entryCode
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
  const pageSize = Math.min(10000, Math.max(1, parseInt(req.query.pageSize) || 50));
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

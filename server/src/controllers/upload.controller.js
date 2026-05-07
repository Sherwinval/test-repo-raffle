import { randomUUID } from 'crypto';
import { parseFileBuffer } from '../utils/parseFile.js';
import { findDuplicateValues, findIncompleteRows } from '../utils/duplicates.js';
import { formatUploadError } from '../utils/errors.js';
import { progressMap } from '../services/progress.service.js';
import {
  mapRowsForInsert,
  findExistingEmails,
  findExistingEmployeeIds,
  buildRowsWithoutDuplicates,
  processUpload
} from '../services/upload.service.js';

export async function uploadParticipants(req, res) {
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
}

export async function validateUpload(req, res) {
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
}

export function getUploadProgress(req, res) {
  const uploadId = req.params.uploadId;
  const progress = progressMap.get(uploadId);
  if (!progress) {
    return res.status(404).json({ error: 'Upload ID not found.' });
  }
  res.json(progress);
}

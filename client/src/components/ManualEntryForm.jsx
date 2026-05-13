import { useMemo, useRef, useState } from 'react';
import { createEntry, fetchAllEntriesForEvent } from '@/features/entry-upload/entryUpload.service';
import DuplicateModal from '@/components/DuplicateModal';

const EXPECTED_HEADERS = ['employeeid', 'fullname', 'department', 'email', 'entrycode'];

function parseBulkRows(text) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) return [];

  const firstDelimiter = lines[0].includes('\t') ? '\t' : ',';
  const rows = lines.map((line) => line.split(firstDelimiter).map((cell) => cell.trim()));

  const firstRowNormalized = rows[0].map((v) => v.toLowerCase().replace(/[\s_]/g, ''));
  const hasHeader =
    firstRowNormalized.length >= 5 &&
    EXPECTED_HEADERS.every((header, i) => firstRowNormalized[i] === header);

  const dataRows = hasHeader ? rows.slice(1) : rows;

  return dataRows.map((row, index) => ({
    rowNumber: hasHeader ? index + 2 : index + 1,
    employeeId: row[0] ?? '',
    fullName: row[1] ?? '',
    department: row[2] ?? '',
    email: row[3] ?? '',
    entryCode: row[4] ?? '',
    rawColumnCount: row.length
  }));
}

function validateBulkRow(row) {
  if (row.rawColumnCount < 5) return `Row ${row.rowNumber}: expected 5 columns.`;
  if (!/^\d{7}$/.test(row.employeeId)) return `Row ${row.rowNumber}: employee ID must be 7 digits.`;
  if (!row.fullName.trim()) return `Row ${row.rowNumber}: full name is required.`;
  if (!row.department.trim()) return `Row ${row.rowNumber}: department is required.`;
  if (!row.email.trim()) return `Row ${row.rowNumber}: email is required.`;
  if (!row.entryCode.trim()) return `Row ${row.rowNumber}: entry code is required.`;
  return null;
}

function findBulkDuplicates(rows) {
  const counts = {
    employeeId: new Map(),
    email: new Map(),
    entryCode: new Map()
  };

  for (const row of rows) {
    counts.employeeId.set(row.employeeId, (counts.employeeId.get(row.employeeId) || 0) + 1);
    counts.email.set(row.email.toLowerCase(), (counts.email.get(row.email.toLowerCase()) || 0) + 1);
    counts.entryCode.set(row.entryCode, (counts.entryCode.get(row.entryCode) || 0) + 1);
  }

  const duplicateRows = rows.filter((row) =>
    (counts.employeeId.get(row.employeeId) || 0) > 1 ||
    (counts.email.get(row.email.toLowerCase()) || 0) > 1 ||
    (counts.entryCode.get(row.entryCode) || 0) > 1
  );

  return { duplicateRows, duplicateCount: duplicateRows.length };
}

function keepFirstUniqueRows(rows) {
  const seenEmployeeIds = new Set();
  const seenEmails = new Set();
  const seenEntryCodes = new Set();
  const kept = [];

  for (const row of rows) {
    const emailKey = row.email.toLowerCase();
    if (seenEmployeeIds.has(row.employeeId) || seenEmails.has(emailKey) || seenEntryCodes.has(row.entryCode)) {
      continue;
    }
    kept.push(row);
    seenEmployeeIds.add(row.employeeId);
    seenEmails.add(emailKey);
    seenEntryCodes.add(row.entryCode);
  }

  return kept;
}

function normalizeForCompare(value) {
  return String(value || '').trim().toLowerCase();
}

function getBulkProgressMessage(status) {
  if (status === 'validating') return 'Validating pasted text...';
  if (status === 'done') return 'Upload complete.';
  if (status === 'canceled') return 'Bulk upload canceled.';
  return 'Uploading rows...';
}

export default function ManualEntryForm({ eventId, onEntryCreated, onError }) {
  const [mode, setMode] = useState('single');
  const [formData, setFormData] = useState({
    employeeId: '',
    fullName: '',
    department: '',
    email: '',
    entryCode: ''
  });
  const [bulkText, setBulkText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bulkResult, setBulkResult] = useState(null);
  const [duplicateModal, setDuplicateModal] = useState(null);
  const [bulkProgress, setBulkProgress] = useState(null);
  const [progressWarning, setProgressWarning] = useState('');
  const bulkCancelRef = useRef(false);

  const parsedBulkRows = useMemo(() => parseBulkRows(bulkText), [bulkText]);

  const handleChange = (field, value) => {
    if (field === 'employeeId') value = value.replace(/\D/g, '').slice(0, 7);
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSingleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    setBulkResult(null);
    try {
      await createEntry({ eventId, ...formData });
      setFormData({
        employeeId: '',
        fullName: '',
        department: '',
        email: '',
        entryCode: ''
      });
      onEntryCreated();
    } catch (err) {
      onError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBulkSubmit = async (e, duplicateMode = null) => {
    e.preventDefault();
    if (isSubmitting) return;

    try {
      const rows = parseBulkRows(bulkText);
      if (rows.length === 0) {
        onError('Paste at least one row to upload.');
        return;
      }

      const validationErrors = rows.map(validateBulkRow).filter(Boolean);
      if (validationErrors.length > 0) {
        onError(validationErrors.slice(0, 5).join(' '));
        return;
      }

      let existingEntries = [];
      try {
        existingEntries = await fetchAllEntriesForEvent(eventId);
      } catch {
        onError('Could not check existing duplicates. You can retry in a moment.');
        return;
      }

      const existingEmployeeIds = new Set(existingEntries.map((r) => normalizeForCompare(r.employeeId)));
      const existingEmails = new Set(existingEntries.map((r) => normalizeForCompare(r.email)));
      const existingEntryCodes = new Set(existingEntries.map((r) => normalizeForCompare(r.entryCode)));

      if (!duplicateMode) {
        const duplicateInfo = findBulkDuplicates(rows);
        const existingDuplicateRows = rows.filter((row) => (
          existingEmployeeIds.has(normalizeForCompare(row.employeeId)) ||
          existingEmails.has(normalizeForCompare(row.email)) ||
          existingEntryCodes.has(normalizeForCompare(row.entryCode))
        ));

        const totalDuplicateCount = duplicateInfo.duplicateCount + existingDuplicateRows.length;
        if (totalDuplicateCount > 0) {
          setDuplicateModal({
            totalRows: rows.length,
            duplicateCount: totalDuplicateCount,
            fileDuplicateCount: duplicateInfo.duplicateCount,
            existingDuplicateCount: existingDuplicateRows.length
          });
          return;
        }
      }

      setIsSubmitting(true);
      setBulkResult(null);
      setDuplicateModal(null);
      setProgressWarning('');
      bulkCancelRef.current = false;

      let created = 0;
      let failed = 0;
      let rowsToUpload = rows;
      if (duplicateMode === 'without') {
        rowsToUpload = keepFirstUniqueRows(rows).filter((row) => (
          !existingEmployeeIds.has(normalizeForCompare(row.employeeId)) &&
          !existingEmails.has(normalizeForCompare(row.email)) &&
          !existingEntryCodes.has(normalizeForCompare(row.entryCode))
        ));
      }

      let processed = 0;
      let lastTick = Date.now();
      setBulkProgress({
        total: rowsToUpload.length,
        processed: 0,
        created: 0,
        failed: 0,
        percent: 0,
        status: 'validating'
      });

      if (rowsToUpload.length === 0) {
        setBulkProgress({
          total: 0,
          processed: 0,
          created: 0,
          failed: 0,
          percent: 100,
          status: 'done'
        });
        setBulkResult({
          total: 0,
          created: 0,
          failed: 0,
          canceled: false
        });
        return;
      }

      const stallTimer = window.setInterval(() => {
        if (Date.now() - lastTick > 8000) {
          setProgressWarning('Upload is taking longer than expected. Still processing...');
        }
      }, 2000);

      for (const row of rowsToUpload) {
        if (bulkCancelRef.current) break;
        try {
          await createEntry({
            eventId,
            employeeId: row.employeeId,
            fullName: row.fullName,
            department: row.department,
            email: row.email,
            entryCode: row.entryCode
          });
          created += 1;
        } catch {
          failed += 1;
        } finally {
          processed += 1;
          lastTick = Date.now();
          const percent = rowsToUpload.length === 0 ? 100 : Math.round((processed / rowsToUpload.length) * 100);
          setBulkProgress({
            total: rowsToUpload.length,
            processed,
            created,
            failed,
            percent,
            status: processed < rowsToUpload.length ? 'uploading' : 'done'
          });
        }
      }

      window.clearInterval(stallTimer);
      setProgressWarning('');
      if (created > 0) onEntryCreated();

      const wasCanceled = bulkCancelRef.current;
      if (wasCanceled) {
        setBulkProgress((prev) => prev ? { ...prev, status: 'canceled' } : prev);
      }

      setBulkResult({
        total: rowsToUpload.length,
        created,
        failed,
        canceled: wasCanceled
      });
    } catch {
      onError('Bulk upload failed unexpectedly. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelBulkUpload = () => {
    if (!isSubmitting) return;
    bulkCancelRef.current = true;
    setProgressWarning('Cancel requested. Finishing current row...');
  };

  const isFormValid =
    formData.employeeId.length === 7 &&
    formData.fullName.trim() !== '' &&
    formData.department.trim() !== '' &&
    formData.email.trim() !== '' &&
    formData.entryCode.trim() !== '';

  return (
    <>
      <div className="manual-entry-panel">
        <p className="card-heading">Manual Entry</p>
        <p className="tiny-copy manual-entry-copy">Add one entry at a time, or paste multiple rows from Excel/Sheets.</p>

      <div className="tab-wrap manual-tab-wrap">
        <button type="button" className={`tab-btn${mode === 'single' ? ' tab-btn--active' : ''}`} onClick={() => setMode('single')}>
          Single Entry
        </button>
        <button type="button" className={`tab-btn${mode === 'bulk' ? ' tab-btn--active' : ''}`} onClick={() => setMode('bulk')}>
          Bulk Paste
        </button>
      </div>

      {mode === 'single' ? (
        <form onSubmit={handleSingleSubmit} className="manual-grid-form">
          <label className="field">
            <span className="field-label">Employee ID</span>
            <input type="text" value={formData.employeeId} onChange={(e) => handleChange('employeeId', e.target.value)} className="event-input" maxLength="7" inputMode="numeric" pattern="[0-9]{7}" placeholder="1234567" required />
          </label>

          <label className="field">
            <span className="field-label">Full Name</span>
            <input type="text" value={formData.fullName} onChange={(e) => handleChange('fullName', e.target.value)} className="event-input" placeholder="John Doe" required />
          </label>

          <label className="field">
            <span className="field-label">Department</span>
            <input type="text" value={formData.department} onChange={(e) => handleChange('department', e.target.value)} className="event-input" placeholder="IT Department" required />
          </label>

          <label className="field">
            <span className="field-label">Email</span>
            <input type="email" value={formData.email} onChange={(e) => handleChange('email', e.target.value)} className="event-input" placeholder="john.doe@company.com" required />
          </label>

          <label className="field manual-span-2">
            <span className="field-label">Entry Code</span>
            <input type="text" value={formData.entryCode} onChange={(e) => handleChange('entryCode', e.target.value)} className="event-input" placeholder="ABC123" required />
          </label>

          <div className="manual-actions manual-span-2">
            <button type="submit" disabled={!isFormValid || isSubmitting} className="btn-primary action-btn">
              {isSubmitting ? 'Adding...' : 'Add Entry'}
            </button>
          </div>
        </form>
      ) : (
        <form onSubmit={handleBulkSubmit} className="manual-bulk-form">
          <label className="field">
            <span className="field-label">Paste Rows (CSV or Excel/Sheets)</span>
            <textarea
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              rows={10}
              className="event-input manual-bulk-input"
              placeholder={'employeeId,fullName,department,email,entryCode\n1234567,John Doe,IT,john@company.com,ABC123'}
              required
            />
          </label>

          <p className="tiny-copy">Expected order: employeeId, fullName, department, email, entryCode. Header row is optional.</p>
          <p className="tiny-copy">Parsed rows: {parsedBulkRows.length}</p>

          {bulkProgress && (
            <div className="soft-card">
              <div className="split-row">
                <div>
                  <p className="card-heading">Bulk upload progress</p>
                  <p className="tiny-copy">{getBulkProgressMessage(bulkProgress.status)}</p>
                </div>
                <div className="stat-col">
                  <p>{bulkProgress.processed}/{bulkProgress.total} rows</p>
                  <p>{bulkProgress.percent}%</p>
                </div>
              </div>
              <div className="progress-track" style={{ marginTop: '0.75rem' }}>
                <div className="progress-fill" style={{ width: `${bulkProgress.percent}%` }} />
                <span className="progress-percent">{bulkProgress.percent}%</span>
              </div>
              {progressWarning && <p className="tiny-copy" style={{ marginTop: '0.5rem' }}>{progressWarning}</p>}
            </div>
          )}

          {bulkResult && (
            <div className="manual-result-card">
              Bulk result: {bulkResult.created}/{bulkResult.total} created, {bulkResult.failed} failed{bulkResult.canceled ? ' (canceled)' : ''}.
            </div>
          )}

          <div className="manual-actions">
            <button type="submit" disabled={isSubmitting || parsedBulkRows.length === 0} className="btn-primary action-btn">
              {isSubmitting ? 'Uploading...' : 'Upload Pasted Rows'}
            </button>
            {isSubmitting && (
              <button type="button" className="btn-ghost action-btn" onClick={handleCancelBulkUpload}>
                Cancel upload
              </button>
            )}
          </div>
        </form>
      )}
      </div>

      {duplicateModal && (
        <DuplicateModal
          modal={duplicateModal}
          onClose={() => setDuplicateModal(null)}
          onUploadWith={(e) => handleBulkSubmit(e, 'with')}
          onUploadWithout={(e) => handleBulkSubmit(e, 'without')}
        />
      )}
    </>
  );
}

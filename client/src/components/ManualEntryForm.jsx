import { useMemo, useRef, useState, useCallback, useEffect } from 'react';
import { createEntry, createBulkEntries, fetchBulkEntryProgress, cancelBulkEntryUpload, resolveBulkEntryDuplicates } from '@/features/entry-upload/entryUpload.service';
import DuplicateModal from '@/components/DuplicateModal';

const EXPECTED_HEADERS = ['employeeid', 'fullname', 'department', 'entrycode'];

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
    email: '',
    entryCode: row[3] ?? '',
    rawColumnCount: row.length
  }));
}

function validateBulkRow(row) {
  if (row.rawColumnCount < 4) return `Row ${row.rowNumber}: expected 4 columns.`;
  if (!/^\d{7}$/.test(row.employeeId)) return `Row ${row.rowNumber}: employee ID must be 7 digits.`;
  if (!row.fullName.trim()) return `Row ${row.rowNumber}: full name is required.`;
  if (!row.department.trim()) return `Row ${row.rowNumber}: department is required.`;
  if (!row.entryCode.trim()) return `Row ${row.rowNumber}: entry code is required.`;
  return null;
}

function getBulkProgressMessage(status) {
  if (status === 'validating') return 'Validating entries...';
  if (status === 'saving') return 'Saving entries to database...';
  if (status === 'done') return 'Upload complete! ⚡';
  if (status === 'canceled' || status === 'canceling') return 'Upload canceled.';
  if (status === 'error') return 'Upload encountered an error.';
  if (status === 'duplicate-confirmation') return 'Duplicates found — please confirm.';
  if (status === 'needs-review') return 'Some rows need review.';
  return 'Processing...';
}

const POLL_INTERVAL = 400;

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
  const activeUploadIdRef = useRef(null);
  const pollTimerRef = useRef(null);

  const parsedBulkRows = useMemo(() => parseBulkRows(bulkText), [bulkText]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, []);

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  const startPolling = useCallback((uploadId) => {
    stopPolling();
    pollTimerRef.current = setInterval(async () => {
      try {
        const progress = await fetchBulkEntryProgress(eventId, uploadId);
        const total = progress.total || 0;
        const processed = progress.processed || 0;
        const percent = total === 0 ? 0 : Math.round((processed / total) * 100);

        setBulkProgress({
          total,
          processed,
          created: progress.inserted || 0,
          failed: 0,
          percent,
          status: progress.status
        });

        if (progress.status === 'duplicate-confirmation') {
          stopPolling();
          setIsSubmitting(false);
          setDuplicateModal({
            totalRows: progress.totalRows || total,
            duplicateCount: progress.duplicateCount || progress.duplicatesDetected || 0,
            fileDuplicateCount: progress.fileDuplicateCount || 0,
            existingDuplicateCount: progress.existingDuplicateCount || 0,
            uploadId
          });
          return;
        }

        if (progress.status === 'done') {
          stopPolling();
          setIsSubmitting(false);
          const inserted = progress.inserted || 0;
          const skipped = progress.skippedRows || 0;
          setBulkResult({
            total: progress.total || 0,
            created: inserted,
            failed: 0,
            skipped,
            canceled: false
          });
          activeUploadIdRef.current = null;
          if (inserted > 0) onEntryCreated();
          return;
        }

        if (progress.status === 'error') {
          stopPolling();
          setIsSubmitting(false);
          activeUploadIdRef.current = null;
          onError(progress.error || 'Upload failed.');
          return;
        }

        if (progress.status === 'canceled') {
          stopPolling();
          setIsSubmitting(false);
          activeUploadIdRef.current = null;
          setBulkResult({
            total: progress.total || 0,
            created: progress.inserted || 0,
            failed: 0,
            skipped: progress.skippedRows || 0,
            canceled: true
          });
          if ((progress.inserted || 0) > 0) onEntryCreated();
          return;
        }
      } catch {
        // Transient fetch error; keep polling
      }
    }, POLL_INTERVAL);
  }, [eventId, onEntryCreated, onError, stopPolling]);

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

    // If this is a duplicate resolution from the modal
    if (duplicateMode && activeUploadIdRef.current) {
      const uploadId = activeUploadIdRef.current;
      setDuplicateModal(null);
      setIsSubmitting(true);
      setProgressWarning('');
      setBulkProgress((prev) => prev ? { ...prev, status: 'validating' } : prev);

      try {
        await resolveBulkEntryDuplicates({ eventId, uploadId, duplicateMode });
        startPolling(uploadId);
      } catch (err) {
        setIsSubmitting(false);
        onError(err.message);
      }
      return;
    }

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

      setIsSubmitting(true);
      setBulkResult(null);
      setDuplicateModal(null);
      setProgressWarning('');
      setBulkProgress({
        total: rows.length,
        processed: 0,
        created: 0,
        failed: 0,
        percent: 0,
        status: 'validating'
      });

      // Send ALL rows in a single request — the server handles batching with createMany
      const { uploadId } = await createBulkEntries({
        eventId,
        rows: rows.map((r) => ({
          rowNumber: r.rowNumber,
          employeeId: r.employeeId,
          fullName: r.fullName,
          department: r.department,
          email: r.email,
          entryCode: r.entryCode
        })),
        duplicateMode
      });

      activeUploadIdRef.current = uploadId;
      startPolling(uploadId);
    } catch (err) {
      setIsSubmitting(false);
      onError(err.message || 'Bulk upload failed unexpectedly. Please try again.');
    }
  };

  const handleCancelBulkUpload = async () => {
    if (!isSubmitting || !activeUploadIdRef.current) return;
    setProgressWarning('Cancel requested...');
    try {
      await cancelBulkEntryUpload(eventId, activeUploadIdRef.current);
    } catch {
      // Best effort
    }
  };

  const isFormValid =
    formData.employeeId.length === 7 &&
    formData.fullName.trim() !== '' &&
    formData.department.trim() !== '' &&
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
              placeholder={'employeeId,fullName,department,entryCode\n1234567,John Doe,IT,ABC123'}
              required
            />
          </label>

          <p className="tiny-copy">Expected order: employeeId, fullName, department, entryCode. Header row is optional.</p>
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
              Bulk result: {bulkResult.created}/{bulkResult.total} created{bulkResult.skipped > 0 ? `, ${bulkResult.skipped} skipped` : ''}{bulkResult.canceled ? ' (canceled)' : ''}.
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
          onClose={() => { setDuplicateModal(null); activeUploadIdRef.current = null; }}
          onUploadWith={(e) => handleBulkSubmit(e, 'with')}
          onUploadWithout={(e) => handleBulkSubmit(e, 'without')}
        />
      )}
    </>
  );
}

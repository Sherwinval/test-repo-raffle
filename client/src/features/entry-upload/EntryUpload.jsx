import { useEffect, useMemo, useRef, useState } from 'react';
import EventSelector from '@/components/EventSelector';
import UploadZone from '@/components/UploadZone';
import ManualEntryForm from '@/components/ManualEntryForm';
import DuplicateModal from '@/components/DuplicateModal';
import EntryIssueModal from '@/components/EntryIssueModal';
import UploadProgress from '@/components/UploadProgress';
import UploadSummary from '@/components/UploadSummary';
import EntriesTable from '@/components/EntriesTable';
import { getProgressPercent, validateEntryUploadSelection } from './entryUpload.logic';
import { cancelUpload, fetchEntryStats, fetchUploadProgress, resolveUploadIssues, uploadEntries } from './entryUpload.service';

const UPLOAD_PROGRESS_STORAGE_KEY = 'rafflehub:active-upload-progress';
const ACTIVE_UPLOAD_STATUSES = new Set(['uploading', 'parsing', 'pending', 'validating', 'needs-review', 'saving', 'processing', 'canceling', 'reconnecting']);
const FINISHED_UPLOAD_STATUSES = new Set(['done', 'error', 'canceled']);

function readSavedUploadProgress(eventId) {
  if (!eventId) return null;
  try {
    const saved = JSON.parse(localStorage.getItem(UPLOAD_PROGRESS_STORAGE_KEY) || 'null');
    if (saved?.eventId !== eventId) return null;
    if (FINISHED_UPLOAD_STATUSES.has(saved.progress?.status)) return null;
    return saved;
  } catch {
    return null;
  }
}

function saveUploadProgressSnapshot({ eventId, uploadId, progress }) {
  if (!eventId || !progress || FINISHED_UPLOAD_STATUSES.has(progress.status)) {
    localStorage.removeItem(UPLOAD_PROGRESS_STORAGE_KEY);
    return;
  }

  localStorage.setItem(UPLOAD_PROGRESS_STORAGE_KEY, JSON.stringify({
    eventId,
    uploadId,
    progress,
    updatedAt: Date.now()
  }));
}

export const EntryUpload = ({
  selectedEvent,
  onSelectEvent,
  onDeleteSelectedEvent,
  onStatsChange,
  onUploadStateChange,
  onAuditChange,
  onEntriesChanged,
  showEntriesTable = true,
  showEntryTools = true,
  showEventSelector = true,
  enableUploadLogic = true
}) => {
  const [file, setFile] = useState(null);
  const [uploadId, setUploadId] = useState(null);
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState(null);
  const [displayProgress, setDisplayProgress] = useState(0);
  const [duplicateModal, setDuplicateModal] = useState(null);
  const [issueModalRows, setIssueModalRows] = useState(null);
  const [isResolvingIssues, setIsResolvingIssues] = useState(false);
  const [entryCount, setEntryCount] = useState(null);
  const [isSubmittingUpload, setIsSubmittingUpload] = useState(false);
  const [progressPollKey, setProgressPollKey] = useState(0);
  const [tableRefreshKey, setTableRefreshKey] = useState(0);
  const [entryMode, setEntryMode] = useState('upload'); // 'upload' or 'manual'
  const fileInputRef = useRef(null);
  const uploadAbortRef = useRef(null);
  const uploadIdRef = useRef(null);

  const progressPercentage = useMemo(() => getProgressPercent(progress), [progress]);
  const isUploading = isSubmittingUpload || Boolean(uploadId);

  useEffect(() => {
    let timerId = window.setInterval(() => {
      setDisplayProgress((current) => {
        if (current >= progressPercentage) {
          window.clearInterval(timerId);
          return current;
        }
        const step = Math.max(1, Math.ceil((progressPercentage - current) / 8));
        return Math.min(progressPercentage, current + step);
      });
    }, 120);
    return () => window.clearInterval(timerId);
  }, [progressPercentage]);

  useEffect(() => {
    uploadIdRef.current = uploadId;
  }, [uploadId]);

  useEffect(() => {
    if (!enableUploadLogic) return;
    if (!uploadId) return;
    const intervalId = window.setInterval(async () => {
      try {
        const data = await fetchUploadProgress(uploadId);
        setProgress(data);
        saveUploadProgressSnapshot({ eventId: selectedEvent?.id, uploadId, progress: data });
        if (data.status === 'error' && data.error) setError(data.error);
        if (data.status === 'duplicate-confirmation') {
          window.clearInterval(intervalId);
          setUploadId(null);
          setDuplicateModal({
            totalRows: data.totalRows ?? data.total ?? 0,
            duplicateCount: data.duplicateCount ?? data.duplicatesDetected ?? 0,
            fileDuplicateCount: data.fileDuplicateCount ?? 0,
            existingDuplicateCount: data.existingDuplicateCount ?? 0
          });
          return;
        }
        if (data.status === 'needs-review') {
          window.clearInterval(intervalId);
          setIssueModalRows(data.invalidRows || []);
          return;
        }
        if (data.status === 'done' || data.status === 'error' || data.status === 'canceled') {
          window.clearInterval(intervalId);
          localStorage.removeItem(UPLOAD_PROGRESS_STORAGE_KEY);
          setUploadId(null);
          setFile(null);
          if (fileInputRef.current) fileInputRef.current.value = '';
          if (selectedEvent) {
            const stats = await fetchEntryStats(selectedEvent.id);
            setEntryCount(stats.totalEntries);
            onAuditChange?.();
          }
          setTableRefreshKey((k) => k + 1);
          onEntriesChanged?.();
        }
      } catch {
        setProgress((current) => {
          const next = {
            ...(current ?? { total: 0, processed: 0, inserted: 0 }),
            status: 'reconnecting',
            priorStatus: current?.status === 'reconnecting' ? current?.priorStatus : current?.status,
            error: 'Reconnecting to upload progress...'
          };
          saveUploadProgressSnapshot({ eventId: selectedEvent?.id, uploadId, progress: next });
          return next;
        });
      }
    }, 500);
    return () => window.clearInterval(intervalId);
  }, [enableUploadLogic, progressPollKey, uploadId, selectedEvent]);

  useEffect(() => {
    if (onStatsChange) {
      onStatsChange({ entryCount: entryCount ?? 0 });
    }
  }, [entryCount, onStatsChange]);

  useEffect(() => {
    if (!enableUploadLogic) return;
    onUploadStateChange?.({
      status: progress?.status || 'idle',
      isActive: ACTIVE_UPLOAD_STATUSES.has(progress?.status) || isSubmittingUpload || Boolean(uploadId)
    });
  }, [enableUploadLogic, isSubmittingUpload, onUploadStateChange, progress?.status, uploadId]);

  useEffect(() => {
    if (!enableUploadLogic) return;
    if (!selectedEvent?.id || !progress) return;
    saveUploadProgressSnapshot({ eventId: selectedEvent.id, uploadId, progress });
  }, [enableUploadLogic, progress, selectedEvent?.id, uploadId]);

  useEffect(() => {
    if (!enableUploadLogic) return;
    if (selectedEvent) {
      const saved = readSavedUploadProgress(selectedEvent.id);
      setProgress(saved?.progress ?? null);
      setUploadId(saved?.uploadId ?? null);
      if (saved?.progress?.status === 'needs-review') {
        setIssueModalRows(saved.progress.invalidRows || []);
      }
      setError(null);
      setDisplayProgress(saved?.progress ? getProgressPercent(saved.progress) : 0);
      setFile(null);
      fetchEntryStats(selectedEvent.id).then((d) => setEntryCount(d.totalEntries)).catch(() => setEntryCount(null));
    }
  }, [enableUploadLogic, selectedEvent]);

  const handleUpload = async (duplicateMode = null) => {
    if (!file || !selectedEvent) return;

    const validationError = validateEntryUploadSelection(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    if (!duplicateMode) {
      const initialProgress = { status: 'uploading', total: 0, processed: 0, inserted: 0 };
      setProgress(initialProgress);
      saveUploadProgressSnapshot({ eventId: selectedEvent.id, uploadId: null, progress: initialProgress });
      setDisplayProgress(0);
    } else {
      setProgress((current) => ({
        ...(current ?? { total: 0, processed: 0, inserted: 0 }),
        status: 'uploading'
      }));
    }

    const abortController = new AbortController();
    uploadAbortRef.current = abortController;
    setIsSubmittingUpload(true);

    try {
      const result = await uploadEntries({
        eventId: selectedEvent.id,
        file,
        duplicateMode,
        signal: abortController.signal
      });
      if (result.status === 'duplicate-confirmation') {
        const body = result.payload;
        setDuplicateModal({
          totalRows: body.totalRows ?? 0,
          duplicateCount: body.duplicateCount ?? 0,
          fileDuplicateCount: body.fileDuplicateCount ?? 0,
          existingDuplicateCount: body.existingDuplicateCount ?? 0
        });
        setProgress((current) => ({ ...(current ?? {}), status: 'duplicate-confirmation' }));
        return;
      }
      const nextUploadId = result.payload.uploadId;
      setUploadId(nextUploadId);
      saveUploadProgressSnapshot({
        eventId: selectedEvent.id,
        uploadId: nextUploadId,
        progress: progress ?? { status: 'uploading', total: 0, processed: 0, inserted: 0 }
      });
    } catch (err) {
      if (err.name === 'AbortError') {
        setProgress({ status: 'canceled', total: 0, processed: 0, inserted: 0 });
        localStorage.removeItem(UPLOAD_PROGRESS_STORAGE_KEY);
        setError(null);
      } else {
        setError(err.message || 'Upload failed.');
      }
    } finally {
      if (uploadAbortRef.current === abortController) uploadAbortRef.current = null;
      setIsSubmittingUpload(false);
    }
  };

  const handleCancelUpload = async () => {
    uploadAbortRef.current?.abort();

    const currentUploadId = uploadIdRef.current;
    if (!currentUploadId) {
      setProgress({ status: 'canceled', total: 0, processed: 0, inserted: 0 });
      localStorage.removeItem(UPLOAD_PROGRESS_STORAGE_KEY);
      setUploadId(null);
      setIsSubmittingUpload(false);
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setProgress((current) => ({
      ...(current ?? { total: 0, processed: 0, inserted: 0 }),
      status: 'canceling'
    }));

    try {
      const canceledProgress = await cancelUpload(currentUploadId);
      setProgress(canceledProgress);
      localStorage.removeItem(UPLOAD_PROGRESS_STORAGE_KEY);
      setError(null);
      setUploadId(null);
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (selectedEvent) {
        const stats = await fetchEntryStats(selectedEvent.id);
        setEntryCount(stats.totalEntries);
      }
      setTableRefreshKey((k) => k + 1);
      onEntriesChanged?.();
    } catch (err) {
      setError(err.message || 'Failed to cancel upload.');
    }
  };

  const handleResolveIssues = async (rows) => {
    if (!uploadId) return;
    setIsResolvingIssues(true);
    setError(null);

    try {
      const nextProgress = await resolveUploadIssues({ uploadId, rows });
      setProgress(nextProgress);
      setIssueModalRows(null);
      setProgressPollKey((key) => key + 1);
    } catch (err) {
      setError(err.message || 'Failed to resolve upload issues.');
    } finally {
      setIsResolvingIssues(false);
    }
  };

  const handleEntryCreated = () => {
    setTableRefreshKey(prev => prev + 1);
    onEntriesChanged?.();
    // Refresh entry count
    if (selectedEvent) {
      fetchEntryStats(selectedEvent.id).then(stats => {
        setEntryCount(stats.totalEntries);
        onStatsChange?.(stats);
        onAuditChange?.();
      }).catch(() => { });
    }
  };

  const handleManualEntryError = (errorMessage) => {
    setError(errorMessage);
  };

  return (
    <>
      {showEventSelector && (
        <EventSelector
          selectedEvent={selectedEvent}
          onSelect={onSelectEvent}
          onDelete={() => {
            onDeleteSelectedEvent();
            setFile(null);
            setProgress(null);
            setIssueModalRows(null);
            localStorage.removeItem(UPLOAD_PROGRESS_STORAGE_KEY);
            setError(null);
            setDisplayProgress(0);
          }}
        />
      )}

      {selectedEvent && showEntryTools && (
        <>
          <div className="section-divider" />

          <div className="selected-event-bar">
            <span className="selected-event-label">Uploading to:</span>
            <span className="selected-event-name">{selectedEvent.name}</span>
            {entryCount !== null && (
              <span className="tiny-copy">{entryCount.toLocaleString()} entries stored</span>
            )}
          </div>

          <div className="tab-wrap" style={{ marginTop: '0.75rem' }}>
            <button
              type="button"
              onClick={() => {
                setEntryMode('upload');
                setError(null);
              }}
              className={`tab-btn${entryMode === 'upload' ? ' tab-btn--active' : ''}`}
            >
              File Upload
            </button>
            <button
              type="button"
              onClick={() => {
                setEntryMode('manual');
                setError(null);
              }}
              className={`tab-btn${entryMode === 'manual' ? ' tab-btn--active' : ''}`}
            >
              Manual Entry
            </button>
          </div>

          {entryMode === 'upload' ? (
            <UploadZone
              file={file}
              setFile={setFile}
              fileInputRef={fileInputRef}
              onUpload={() => handleUpload(null)}
              uploading={isUploading}
              setError={setError}
              onRemoveFile={() => { setFile(null); setError(null); }}
              onCancelUpload={handleCancelUpload}
            />
          ) : (
            <ManualEntryForm
              eventId={selectedEvent.id}
              onEntryCreated={handleEntryCreated}
              onError={handleManualEntryError}
            />
          )}

          <div className="status-stack">
            {error && <div className="error-card">{error}</div>}
            {progress && <UploadProgress progress={progress} displayProgress={displayProgress} />}
            {progress?.status === 'done' && <UploadSummary progress={progress} />}
          </div>

          {showEntriesTable && (
            <>
              <div className="section-divider" />

              <EntriesTable
                eventId={selectedEvent.id}
                refreshKey={tableRefreshKey}
              />
            </>
          )}
        </>
      )}

      {duplicateModal && (
        <DuplicateModal
          modal={duplicateModal}
          onClose={() => setDuplicateModal(null)}
          onUploadWith={() => { setDuplicateModal(null); handleUpload('with'); }}
          onUploadWithout={() => { setDuplicateModal(null); handleUpload('without'); }}
        />
      )}

      {issueModalRows && (
        <EntryIssueModal
          rows={issueModalRows}
          resolving={isResolvingIssues}
          onResolve={handleResolveIssues}
        />
      )}
    </>
  );
};

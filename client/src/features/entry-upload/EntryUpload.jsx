import { useEffect, useMemo, useRef, useState } from 'react';
import EventSelector from '@/components/EventSelector';
import UploadZone from '@/components/UploadZone';
import ManualEntryForm from '@/components/ManualEntryForm';
import DuplicateModal from '@/components/DuplicateModal';
import UploadProgress from '@/components/UploadProgress';
import UploadSummary from '@/components/UploadSummary';
import EntriesTable from '@/components/EntriesTable';
import { getProgressPercent, validateEntryUploadSelection } from './entryUpload.logic';
import { cancelUpload, fetchEntryStats, fetchUploadProgress, uploadEntries } from './entryUpload.service';

export const EntryUpload = ({ selectedEvent, onSelectEvent, onDeleteSelectedEvent, onStatsChange }) => {
  const [file, setFile] = useState(null);
  const [uploadId, setUploadId] = useState(null);
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState(null);
  const [displayProgress, setDisplayProgress] = useState(0);
  const [duplicateModal, setDuplicateModal] = useState(null);
  const [entryCount, setEntryCount] = useState(null);
  const [isSubmittingUpload, setIsSubmittingUpload] = useState(false);
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
    if (!uploadId) return;
    const intervalId = window.setInterval(async () => {
      try {
        const data = await fetchUploadProgress(uploadId);
        setProgress(data);
        if (data.status === 'error' && data.error) setError(data.error);
        if (data.status === 'done' || data.status === 'error' || data.status === 'canceled') {
          window.clearInterval(intervalId);
          setUploadId(null);
          setFile(null);
          if (fileInputRef.current) fileInputRef.current.value = '';
          if (selectedEvent) {
            const stats = await fetchEntryStats(selectedEvent.id);
            setEntryCount(stats.totalEntries);
          }
          setTableRefreshKey((k) => k + 1);
        }
      } catch {
        setError('Unable to fetch upload status.');
      }
    }, 1000);
    return () => window.clearInterval(intervalId);
  }, [uploadId, selectedEvent]);

  useEffect(() => {
    if (onStatsChange) {
      onStatsChange({ entryCount: entryCount ?? 0 });
    }
  }, [entryCount, onStatsChange]);

  useEffect(() => {
    if (selectedEvent) {
      setProgress(null);
      setError(null);
      setDisplayProgress(0);
      setFile(null);
      fetchEntryStats(selectedEvent.id).then((d) => setEntryCount(d.totalEntries)).catch(() => setEntryCount(null));
    }
  }, [selectedEvent]);

  const handleUpload = async (duplicateMode = null) => {
    if (!file || !selectedEvent) return;

    const validationError = validateEntryUploadSelection(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    if (!duplicateMode) {
      setProgress(null);
      setDisplayProgress(0);
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
        return;
      }
      setUploadId(result.payload.uploadId);
    } catch (err) {
      if (err.name === 'AbortError') {
        setProgress({ status: 'canceled', total: 0, processed: 0, inserted: 0 });
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
      setError(null);
      setUploadId(null);
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (selectedEvent) {
        const stats = await fetchEntryStats(selectedEvent.id);
        setEntryCount(stats.totalEntries);
      }
      setTableRefreshKey((k) => k + 1);
    } catch (err) {
      setError(err.message || 'Failed to cancel upload.');
    }
  };

  const handleEntryCreated = () => {
    setTableRefreshKey(prev => prev + 1);
    // Refresh entry count
    if (selectedEvent) {
      fetchEntryStats(selectedEvent.id).then(stats => {
        setEntryCount(stats.totalEntries);
        onStatsChange?.(stats);
      }).catch(() => {});
    }
  };

  const handleManualEntryError = (errorMessage) => {
    setError(errorMessage);
  };

  return (
    <>
      <EventSelector
        selectedEvent={selectedEvent}
        onSelect={onSelectEvent}
        onDelete={() => {
          onDeleteSelectedEvent();
          setFile(null);
          setProgress(null);
          setError(null);
          setDisplayProgress(0);
        }}
      />

      {selectedEvent && (
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

          <div className="section-divider" />

          <EntriesTable
            eventId={selectedEvent.id}
            refreshKey={tableRefreshKey}
          />
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
    </>
  );
};

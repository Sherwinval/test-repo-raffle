import { useEffect, useMemo, useRef, useState } from 'react';
import EventSelector from '@/components/EventSelector';
import UploadZone from '@/components/UploadZone';
import DuplicateModal from '@/components/DuplicateModal';
import UploadProgress from '@/components/UploadProgress';
import UploadSummary from '@/components/UploadSummary';
import EntriesTable from '@/components/EntriesTable';
import { getProgressPercent, validateEntryUploadSelection } from './entryUpload.logic';
import { fetchEntryStats, fetchUploadProgress, uploadEntries } from './entryUpload.service';

export const EntryUpload = ({ selectedEvent, onSelectEvent, onDeleteSelectedEvent }) => {
  const [file, setFile] = useState(null);
  const [uploadId, setUploadId] = useState(null);
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState(null);
  const [displayProgress, setDisplayProgress] = useState(0);
  const [duplicateModal, setDuplicateModal] = useState(null);
  const [entryCount, setEntryCount] = useState(null);
  const [tableRefreshKey, setTableRefreshKey] = useState(0);
  const fileInputRef = useRef(null);

  const progressPercentage = useMemo(() => getProgressPercent(progress), [progress]);

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
    if (!uploadId) return;
    const intervalId = window.setInterval(async () => {
      try {
        const data = await fetchUploadProgress(uploadId);
        setProgress(data);
        if (data.status === 'error' && data.error) setError(data.error);
        if (data.status === 'done' || data.status === 'error') {
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

    try {
      const result = await uploadEntries({ eventId: selectedEvent.id, file, duplicateMode });
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
      setError(err.message || 'Upload failed.');
    }
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

          <UploadZone
            file={file}
            setFile={setFile}
            fileInputRef={fileInputRef}
            onUpload={() => handleUpload(null)}
            uploading={Boolean(uploadId)}
            setError={setError}
            onRemoveFile={() => { setFile(null); setError(null); }}
          />

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

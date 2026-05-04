import { useEffect, useMemo, useRef, useState } from 'react';
import EventSelector from './components/EventSelector';
import UploadZone from './components/UploadZone';
import DuplicateModal from './components/DuplicateModal';
import UploadProgress from './components/UploadProgress';
import UploadSummary from './components/UploadSummary';
import EntriesTable from './components/EntriesTable';

function App() {
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [file, setFile] = useState(null);
  const [uploadId, setUploadId] = useState(null);
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState(null);
  const [displayProgress, setDisplayProgress] = useState(0);
  const [duplicateModal, setDuplicateModal] = useState(null);
  const [entryCount, setEntryCount] = useState(null);
  const [tableRefreshKey, setTableRefreshKey] = useState(0);
  const fileInputRef = useRef(null);

  const progressPercentage = useMemo(() => {
    if (!progress || !progress.total) return 0;
    return Math.min(100, Math.round((progress.processed / progress.total) * 100));
  }, [progress]);

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
        const res = await fetch(`/api/upload/progress/${uploadId}`);
        if (!res.ok) {
          const body = await res.json();
          setError(body?.error || 'Progress request failed.');
          return;
        }
        const data = await res.json();
        setProgress(data);
        if (data.status === 'error' && data.error) setError(data.error);
        if (data.status === 'done' || data.status === 'error') {
          window.clearInterval(intervalId);
          setUploadId(null);
          setFile(null);
          if (fileInputRef.current) fileInputRef.current.value = '';
          if (selectedEvent) fetchEntryCount(selectedEvent.id);
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
      fetchEntryCount(selectedEvent.id);
    }
  }, [selectedEvent]);

  async function fetchEntryCount(eventId) {
    try {
      const res = await fetch(`/api/events/${eventId}/entries/stats`);
      const data = await res.json();
      setEntryCount(data.totalEntries);
    } catch {
      setEntryCount(null);
    }
  }

  async function handleUpload(duplicateMode = null) {
    if (!file || !selectedEvent) return;

    setError(null);
    if (!duplicateMode) {
      setProgress(null);
      setDisplayProgress(0);
    }

    const formData = new FormData();
    formData.append('file', file);
    if (duplicateMode) formData.append('duplicateMode', duplicateMode);

    const res = await fetch(`/api/events/${selectedEvent.id}/entries/upload`, {
      method: 'POST',
      body: formData
    });

    if (!res.ok) {
      const body = await res.json();
      if (res.status === 409) {
        setDuplicateModal({
          totalRows: body.totalRows ?? 0,
          duplicateCount: body.duplicateCount ?? 0,
          fileDuplicateCount: body.fileDuplicateCount ?? 0,
          existingDuplicateCount: body.existingDuplicateCount ?? 0
        });
        return;
      }
      setError(body?.error || 'Upload failed.');
      return;
    }

    const { uploadId: returnedId } = await res.json();
    setUploadId(returnedId);
  }

  function handleEventSelect(ev) {
    setSelectedEvent(ev);
  }

  return (
    <div className="page-shell app-root">
      <div className="app-container">
        <div className="hero-card">
          <div className="badge-row">
            <span className="pill">Entry Upload</span>
            <span className="pill">CSV / XLS / XLSX</span>
          </div>

          <h1 className="title">Raffle Entry Upload</h1>
          <p className="subtitle">
            Select an event, import participant entries from CSV or Excel, and watch live progress while records are saved.
          </p>

          <EventSelector
            selectedEvent={selectedEvent}
            onSelect={handleEventSelect}
            onDelete={() => {
              setSelectedEvent(null);
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
                {progress && (
                  <UploadProgress progress={progress} displayProgress={displayProgress} />
                )}
                {progress?.status === 'done' && (
                  <UploadSummary progress={progress} />
                )}
              </div>

              <div className="section-divider" />

              <EntriesTable
                eventId={selectedEvent.id}
                refreshKey={tableRefreshKey}
              />
            </>
          )}
        </div>
      </div>

      {duplicateModal && (
        <DuplicateModal
          modal={duplicateModal}
          onClose={() => setDuplicateModal(null)}
          onUploadWith={() => { setDuplicateModal(null); handleUpload('with'); }}
          onUploadWithout={() => { setDuplicateModal(null); handleUpload('without'); }}
        />
      )}
    </div>
  );
}

export default App;

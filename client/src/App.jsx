import { useEffect, useMemo, useRef, useState } from 'react';

function App() {
  const [file, setFile] = useState(null);
  const [uploadId, setUploadId] = useState(null);
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);
  const [displayProgress, setDisplayProgress] = useState(0);
  const [duplicateModal, setDuplicateModal] = useState(null);
  const fileInputRef = useRef(null);

  const progressPercentage = useMemo(() => {
    if (!progress || !progress.total) return 0;
    return Math.min(100, Math.round((progress.processed / progress.total) * 100));
  }, [progress]);

  useEffect(() => {
    let timerId;
    setDisplayProgress((current) => {
      if (progressPercentage <= current) return current;
      return current;
    });

    timerId = window.setInterval(() => {
      setDisplayProgress((current) => {
        if (current >= progressPercentage) {
          window.clearInterval(timerId);
          return current;
        }
        const step = Math.max(1, Math.ceil((progressPercentage - current) / 8));
        return Math.min(progressPercentage, current + step);
      });
    }, 120);

    return () => {
      window.clearInterval(timerId);
    };
  }, [progressPercentage]);

  useEffect(() => {
    let intervalId;
    if (uploadId) {
      intervalId = window.setInterval(async () => {
        try {
          const res = await fetch(`/api/upload/progress/${uploadId}`);
          if (!res.ok) {
            const body = await res.json();
            setError(body?.error || 'Progress request failed.');
            return;
          }
          const data = await res.json();
          setProgress(data);
          if (data.status === 'error' && data.error) {
            setError(data.error);
          }
          if (data.status === 'done' || data.status === 'error') {
            window.clearInterval(intervalId);
            setUploadId(null);
            setFile(null);
            if (fileInputRef.current) {
              fileInputRef.current.value = '';
            }
            fetchStats();
          }
        } catch (err) {
          setError('Unable to fetch upload status.');
        }
      }, 1000);
    }

    return () => {
      if (intervalId) {
        window.clearInterval(intervalId);
      }
    };
  }, [uploadId]);

  async function fetchStats() {
    try {
      const res = await fetch('/api/participants/stats');
      const data = await res.json();
      setStats(data.totalParticipants);
    } catch {
      setStats(null);
    }
  }

  useEffect(() => {
    fetchStats();
  }, []);

  async function handleUpload(duplicateMode = null) {
    if (!file) {
      setError('Please choose a CSV or Excel file first.');
      return;
    }

    setError(null);
    setProgress(null);
    setDisplayProgress(0);

    const formData = new FormData();
    formData.append('file', file);
    if (duplicateMode) {
      formData.append('duplicateMode', duplicateMode);
    }

    if (!duplicateMode) {
      const validateResponse = await fetch('/api/upload/validate', {
        method: 'POST',
        body: formData
      });

      if (!validateResponse.ok) {
        const body = await validateResponse.json();
        setError(body?.error || 'Validation failed.');
        return;
      }

      const validationData = await validateResponse.json();
      if (validationData.duplicateCount > 0) {
        setDuplicateModal({
          totalRows: validationData.totalRows ?? 0,
          duplicateCount: validationData.duplicateCount,
          fileDuplicateCount: validationData.fileDuplicateCount ?? 0,
          existingDuplicateCount: validationData.existingDuplicateCount ?? 0
        });
        return;
      }
    }

    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      const body = await response.json();
      if (response.status === 409) {
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

    const { uploadId: returnedId } = await response.json();
    setUploadId(returnedId);
  }

  return (
    <div className="page-shell app-root">
      <div className="app-container">
        <div className="hero-card">
          <div className="badge-row">
            <span className="pill">Data Intake</span>
            <span className="pill">CSV / XLS / XLSX</span>
          </div>

          <h1 className="title">Entry Upload</h1>
          <p className="subtitle">
            Import participant data from CSV or Excel, review duplicates before insert, and watch live progress while records are saved.
          </p>

          <div className="upload-row">
            <label className="field">
              <span className="field-label">Select file to upload</span>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xls,.xlsx"
                className="file-input"
                onChange={(event) => {
                  setFile(event.target.files?.[0] ?? null);
                  setError(null);
                }}
              />
            </label>

            <button
              className="btn-primary action-btn"
              onClick={() => handleUpload(false)}
              disabled={!file || Boolean(uploadId)}
            >
              {uploadId ? 'Uploading...' : 'Start upload'}
            </button>
          </div>

          <div className="status-stack">
            {error ? <div className="error-card">{error}</div> : null}

            {progress ? (
              <div className="soft-card">
                <div className="split-row">
                  <div>
                    <p className="card-heading">Upload status</p>
                    <p className="tiny-copy">{progress.status}</p>
                    {progress.error ? <p className="tiny-copy">{progress.error}</p> : null}
                  </div>
                  <div className="stat-col">
                    <p>{progress.total ? `${progress.processed}/${progress.total}` : progress.processed} processed</p>
                    <p>{progress.inserted} inserted</p>
                    <p>{progress.duplicateCount} skipped duplicates</p>
                  </div>
                </div>
                <div className="progress-track">
                  <div className="progress-fill" style={{ width: `${displayProgress}%` }} />
                </div>
              </div>
            ) : null}

            <div className="soft-card">
              <p className="card-heading">Total participants stored</p>
              <p className="total-value">{stats ?? '-'}</p>
            </div>
          </div>
        </div>
      </div>
      {duplicateModal ? (
        <div className="dup-modal-backdrop" onClick={() => setDuplicateModal(null)}>
          <div className="dup-modal" onClick={(event) => event.stopPropagation()}>
            <button
              type="button"
              className="dup-modal-close"
              onClick={() => setDuplicateModal(null)}
              aria-label="Close duplicate options"
            >
              x
            </button>
            <h2 className="dup-modal-title">Duplicate Entries Detected</h2>
            <p className="dup-modal-copy">
              Uploaded dataset rows: {duplicateModal.totalRows}
            </p>
            <p className="dup-modal-copy">
              Duplicate rows detected: {duplicateModal.duplicateCount}
            </p>
            <p className="dup-modal-copy">
              In-file duplicates: {duplicateModal.fileDuplicateCount} | Already in database: {duplicateModal.existingDuplicateCount}
            </p>
            <div className="dup-modal-actions">
              <button
                type="button"
                className="warn-btn"
                onClick={() => {
                  setDuplicateModal(null);
                  handleUpload('with');
                }}
              >
                Upload with duplicates
              </button>
              <button
                type="button"
                className="btn-primary action-btn"
                onClick={() => {
                  setDuplicateModal(null);
                  handleUpload('without');
                }}
              >
                Upload without duplicates
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default App;

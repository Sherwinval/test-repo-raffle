import { useEffect, useMemo, useState } from 'react';

function App() {
  const [file, setFile] = useState(null);
  const [uploadId, setUploadId] = useState(null);
  const [progress, setProgress] = useState(null);
  const [duplicateCheck, setDuplicateCheck] = useState(null);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);

  const progressPercentage = useMemo(() => {
    if (!progress || !progress.total) return 0;
    return Math.min(100, Math.round((progress.processed / progress.total) * 100));
  }, [progress]);

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
          if (data.status === 'done' || data.status === 'error') {
            window.clearInterval(intervalId);
            setUploadId(null);
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

  async function handleUpload(allowDuplicates = false) {
    if (!file) {
      setError('Please choose a CSV or Excel file first.');
      return;
    }

    setError(null);
    setProgress(null);
    setDuplicateCheck(null);

    const formData = new FormData();
    formData.append('file', file);

    if (!allowDuplicates) {
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
        setDuplicateCheck({
          totalRows: validationData.totalRows,
          duplicateCount: validationData.duplicateCount,
          duplicateEmails: validationData.duplicateEmails ?? []
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
      setError(body?.error || 'Upload failed.');
      return;
    }

    const { uploadId: returnedId } = await response.json();
    setUploadId(returnedId);
    setDuplicateCheck(null);
  }

  async function uploadAnyway() {
    await handleUpload(true);
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
                type="file"
                accept=".csv,.xls,.xlsx"
                className="file-input"
                onChange={(event) => {
                  setFile(event.target.files?.[0] ?? null);
                  setDuplicateCheck(null);
                  setError(null);
                }}
              />
            </label>

            <button
              className="btn-primary action-btn"
              onClick={handleUpload}
              disabled={!file || Boolean(uploadId)}
            >
              {uploadId ? 'Uploading...' : 'Start upload'}
            </button>
          </div>

          <div className="status-stack">
            {error ? <div className="error-card">{error}</div> : null}

            {duplicateCheck ? (
              <div className="warn-card">
                <p className="card-heading">Duplicate entries detected</p>
                <p className="card-copy">
                  Your file contains {duplicateCheck.duplicateCount} duplicate record{duplicateCheck.duplicateCount === 1 ? '' : 's'} out of {duplicateCheck.totalRows} total rows.
                </p>
                <p className="card-copy">
                  The system will dedupe by email and skip duplicate inserts on upload.
                </p>
                {duplicateCheck.duplicateEmails.length > 0 ? (
                  <div className="warn-inner">
                    <p className="card-subheading">Duplicate email addresses</p>
                    <ul className="email-list">
                      {duplicateCheck.duplicateEmails.slice(0, 10).map((email) => (
                        <li key={email}>{email}</li>
                      ))}
                    </ul>
                    {duplicateCheck.duplicateEmails.length > 10 ? (
                      <p className="muted-note">
                        And {duplicateCheck.duplicateEmails.length - 10} more duplicate email{duplicateCheck.duplicateEmails.length - 10 === 1 ? '' : 's'}.
                      </p>
                    ) : null}
                  </div>
                ) : null}
                <button className="warn-btn" onClick={uploadAnyway}>
                  Upload anyway
                </button>
              </div>
            ) : null}

            {progress ? (
              <div className="soft-card">
                <div className="split-row">
                  <div>
                    <p className="card-heading">Upload status</p>
                    <p className="tiny-copy">{progress.status}</p>
                  </div>
                  <div className="stat-col">
                    <p>{progress.total ? `${progress.processed}/${progress.total}` : progress.processed} processed</p>
                    <p>{progress.inserted} inserted</p>
                    <p>{progress.duplicateCount} skipped duplicates</p>
                  </div>
                </div>
                <div className="progress-track">
                  <div className="progress-fill" style={{ width: `${progressPercentage}%` }} />
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
    </div>
  );
}

export default App;

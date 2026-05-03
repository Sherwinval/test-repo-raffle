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
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-4xl px-4 py-10">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-3xl font-semibold text-slate-900">Entry Upload</h1>
          <p className="mt-2 text-slate-600">
            Upload a participant CSV or Excel file and monitor progress while Prisma persists data to Supabase/Postgres.
          </p>

          <div className="mt-8 space-y-4">
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Select file</span>
              <input
                type="file"
                accept=".csv,.xls,.xlsx"
                className="mt-2 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 outline-none focus:border-slate-500"
                onChange={(event) => {
                  setFile(event.target.files?.[0] ?? null);
                  setDuplicateCheck(null);
                  setError(null);
                }}
              />
            </label>

            <button
              className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
              onClick={handleUpload}
              disabled={!file || Boolean(uploadId)}
            >
              {uploadId ? 'Uploading…' : 'Start upload'}
            </button>

            {error ? <div className="rounded-2xl bg-rose-50 p-4 text-rose-700">{error}</div> : null}

            {duplicateCheck ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
                <p className="font-semibold">Duplicate entries detected</p>
                <p className="mt-2 text-sm text-amber-900">
                  Your file contains {duplicateCheck.duplicateCount} duplicate record{duplicateCheck.duplicateCount === 1 ? '' : 's'} out of {duplicateCheck.totalRows} total rows.
                </p>
                <p className="mt-2 text-sm text-amber-900">
                  The system will dedupe by email and skip duplicate inserts on upload.
                </p>
                {duplicateCheck.duplicateEmails.length > 0 ? (
                  <div className="mt-4 rounded-2xl bg-amber-100 p-3 text-sm text-slate-800">
                    <p className="font-medium">Duplicate email addresses</p>
                    <ul className="mt-2 list-disc space-y-1 pl-5">
                      {duplicateCheck.duplicateEmails.slice(0, 10).map((email) => (
                        <li key={email}>{email}</li>
                      ))}
                    </ul>
                    {duplicateCheck.duplicateEmails.length > 10 ? (
                      <p className="mt-2 text-xs text-slate-600">
                        And {duplicateCheck.duplicateEmails.length - 10} more duplicate email{duplicateCheck.duplicateEmails.length - 10 === 1 ? '' : 's'}.
                      </p>
                    ) : null}
                  </div>
                ) : null}
                <button
                  className="mt-4 inline-flex items-center justify-center rounded-xl bg-amber-900 px-5 py-3 text-sm font-semibold text-white hover:bg-amber-700"
                  onClick={uploadAnyway}
                >
                  Upload anyway
                </button>
              </div>
            ) : null}

            {progress ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">Upload status</p>
                    <p className="text-xs text-slate-500">{progress.status}</p>
                  </div>
                  <div className="text-right text-sm text-slate-700">
                    <p>{progress.total ? `${progress.processed}/${progress.total}` : progress.processed} processed</p>
                    <p>{progress.inserted} inserted</p>
                    <p>{progress.duplicateCount} skipped duplicates</p>
                  </div>
                </div>
                <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-200">
                  <div className="h-full rounded-full bg-slate-900" style={{ width: `${progressPercentage}%` }} />
                </div>
              </div>
            ) : null}

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-800">Total participants stored</p>
              <p className="mt-2 text-3xl font-semibold text-slate-900">{stats ?? '—'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;

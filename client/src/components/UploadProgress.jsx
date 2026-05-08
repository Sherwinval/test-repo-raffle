const STAGES = ['Uploading', 'Parsing', 'Validating', 'Saving', 'Done'];

function currentStage(status) {
  if (status === 'done') return 'Done';
  if (status === 'error') return 'Error';
  if (status === 'canceled') return 'Canceled';
  if (status === 'canceling') return 'Canceling';
  if (status === 'processing') return 'Saving';
  if (status === 'pending') return 'Parsing';
  return 'Uploading';
}

export default function UploadProgress({ progress, displayProgress }) {
  const stage = currentStage(progress.status);
  const isDone = progress.status === 'done';
  const isError = progress.status === 'error';
  const isCanceled = progress.status === 'canceled';
  const isCanceling = progress.status === 'canceling';

  const stageIndex = STAGES.indexOf(stage);

  return (
    <div className={`soft-card upload-progress-card${isError ? ' upload-progress-card--error' : ''}${isCanceled || isCanceling ? ' upload-progress-card--canceled' : ''}`}>
      <div className="split-row">
        <div>
          <p className="card-heading">Upload status</p>
          <div className="stage-track">
            {STAGES.map((s, i) => (
              <span
                key={s}
                className={`stage-dot${i < stageIndex || isDone ? ' stage-dot--done' : ''}${s === stage && !isDone ? ' stage-dot--active' : ''}`}
              >
                {s}
              </span>
            ))}
          </div>
          {isError && progress.error && (
            <p className="tiny-copy" style={{ color: '#be123c', marginTop: '0.25rem' }}>{progress.error}</p>
          )}
          {isCanceling && (
            <p className="tiny-copy" style={{ color: '#92400e', marginTop: '0.25rem' }}>Canceling upload and removing saved rows...</p>
          )}
          {isCanceled && (
            <p className="tiny-copy" style={{ color: '#92400e', marginTop: '0.25rem' }}>Upload canceled. Saved rows from this batch were removed.</p>
          )}
        </div>
        <div className="stat-col">
          {progress.total > 0 && (
            <p>{progress.processed}/{progress.total} rows</p>
          )}
          <p>{progress.inserted ?? 0} inserted</p>
          {(progress.skippedRows ?? 0) > 0 && (
            <p>{progress.skippedRows} skipped</p>
          )}
          {(progress.errors?.length ?? 0) > 0 && (
            <p>{progress.errors.length} errors</p>
          )}
        </div>
      </div>
      <div className="progress-track" style={{ marginTop: '1rem' }}>
        <div className="progress-fill" style={{ width: `${isDone ? 100 : displayProgress}%` }} />
      </div>
    </div>
  );
}

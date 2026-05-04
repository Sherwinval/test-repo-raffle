export default function UploadSummary({ progress }) {
  const errorCount = progress.errors?.length ?? 0;

  function downloadErrors() {
    if (errorCount === 0) return;
    const header = 'row_number,missing_fields';
    const rows = progress.errors.map((e) => `${e.rowNumber},"${e.missingFields.join(', ')}"`);
    const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'upload-errors.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="summary-card">
      <p className="card-heading">Upload complete</p>
      <div className="summary-stats">
        <div className="summary-stat">
          <span className="summary-num">{progress.total ?? 0}</span>
          <span className="summary-label">received</span>
        </div>
        <div className="summary-stat summary-stat--success">
          <span className="summary-num">{progress.inserted ?? 0}</span>
          <span className="summary-label">imported</span>
        </div>
        <div className="summary-stat summary-stat--warn">
          <span className="summary-num">{progress.skippedRows ?? 0}</span>
          <span className="summary-label">duplicates skipped</span>
        </div>
        {errorCount > 0 && (
          <div className="summary-stat summary-stat--error">
            <span className="summary-num">{errorCount}</span>
            <span className="summary-label">incomplete rows</span>
          </div>
        )}
      </div>
      {errorCount > 0 && (
        <button type="button" className="btn-ghost" onClick={downloadErrors} style={{ marginTop: '0.75rem' }}>
          Download error report
        </button>
      )}
    </div>
  );
}

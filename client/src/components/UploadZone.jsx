import { useState } from 'react';

const ACCEPTED_EXTENSIONS = ['csv', 'xls', 'xlsx'];

export default function UploadZone({ file, setFile, fileInputRef, onUpload, uploading, setError, onRemoveFile, onCancelUpload }) {
  const [dragging, setDragging] = useState(false);

  function validateAndSetFile(f) {
    const ext = f.name.split('.').pop()?.toLowerCase();
    if (!ACCEPTED_EXTENSIONS.includes(ext)) {
      setError('Unsupported file format. Use CSV, XLS, or XLSX.');
      return;
    }
    setError(null);
    setFile(f);
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) validateAndSetFile(f);
  }

  function downloadTemplate() {
    const csv = 'employee_id,full_name,department,email,entry_code\n';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'raffle-entry-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="upload-section">
      <div
        role="button"
        tabIndex={0}
        className={`drop-zone${dragging ? ' drop-zone--active' : ''}${file ? ' drop-zone--has-file' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click(); }}
        aria-label="File upload area"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xls,.xlsx"
          className="file-input-hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) validateAndSetFile(f); }}
        />
        {file ? (
          <div className="drop-zone-file">
            <span className="drop-zone-icon">FILE</span>
            <span className="drop-zone-filename">{file.name}</span>
            <span className="drop-zone-size">{(file.size / 1024).toFixed(1)} KB</span>
            <button
              type="button"
              className="drop-zone-remove"
              aria-label="Remove file"
              onClick={(e) => {
                e.stopPropagation();
                if (fileInputRef.current) fileInputRef.current.value = '';
                onRemoveFile();
              }}
            >
              Remove
            </button>
          </div>
        ) : (
          <div className="drop-zone-prompt">
            <span className="drop-zone-icon">UPLOAD</span>
            <span className="drop-zone-label">Drag and drop your CSV here</span>
            <span className="tiny-copy">CSV, XLS, or XLSX - max 10 MB</span>
            <button type="button" className="btn-ghost browse-btn">Browse file</button>
          </div>
        )}
      </div>

      <div className="upload-actions">
        <button type="button" className="btn-ghost action-btn" onClick={downloadTemplate}>
          Download template
        </button>
        <button
          type="button"
          className="btn-primary action-btn"
          onClick={onUpload}
          disabled={!file || uploading}
        >
          {uploading ? 'Uploading...' : 'Start upload'}
        </button>
        {uploading && (
          <button
            type="button"
            className="btn-ghost action-btn"
            onClick={onCancelUpload}
          >
            Cancel upload
          </button>
        )}
      </div>
    </div>
  );
}
import { useState } from 'react';

const ACCEPTED_EXTENSIONS = ['csv', 'xls', 'xlsx'];

const IconCloudUpload = () => (
  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#ef4444' }}>
    <path d="M16 16l-4-4-4 4"/><path d="M12 12v9"/><path d="M20.39 18.39A5 5 0 0018 9h-1.26A8 8 0 103 16.3"/>
  </svg>
);

const IconFileCheck = () => (
  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#00c853' }}>
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M9 15l2 2 4-4"/>
  </svg>
);

const IconDownload = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
);

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
            <IconFileCheck />
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
              ✕ Remove
            </button>
          </div>
        ) : (
          <div className="drop-zone-prompt">
            <IconCloudUpload />
            <span className="drop-zone-label">Drag and drop your file here</span>
            <span className="tiny-copy">CSV, XLS, or XLSX — max 10 MB</span>
            <button type="button" className="btn-ghost browse-btn">Browse file</button>
          </div>
        )}
      </div>

      <div className="upload-actions">
        <button type="button" className="btn-ghost action-btn" onClick={downloadTemplate}>
          <IconDownload /> Download template
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

const IconClose = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

export default function DuplicateModal({ modal, onClose, onUploadWith, onUploadWithout }) {
  return (
    <div className="dup-modal-backdrop" onClick={onClose}>
      <div className="dup-modal" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="dup-modal-close"
          onClick={onClose}
          aria-label="Close duplicate options"
        >
          <IconClose />
        </button>

        <div className="dup-modal-scroll">
          <h2 className="dup-modal-title">Duplicate Entries Detected</h2>
          <p className="dup-modal-copy">Choose how to continue this upload.</p>

          <div className="dup-modal-stats">
            <div className="dup-stat">
              <span className="dup-stat-label">Rows</span>
              <strong className="dup-stat-value">{modal.totalRows}</strong>
            </div>
            <div className="dup-stat">
              <span className="dup-stat-label">Duplicates</span>
              <strong className="dup-stat-value">{modal.duplicateCount}</strong>
            </div>
            <div className="dup-stat">
              <span className="dup-stat-label">In File</span>
              <strong className="dup-stat-value">{modal.fileDuplicateCount}</strong>
            </div>
            <div className="dup-stat">
              <span className="dup-stat-label">In Database</span>
              <strong className="dup-stat-value">{modal.existingDuplicateCount}</strong>
            </div>
          </div>
        </div>

        <div className="dup-modal-actions">
          <button type="button" className="btn-primary action-btn" onClick={onUploadWithout}>
            Upload without duplicates
          </button>
          <button type="button" className="warn-btn" onClick={onUploadWith}>
            Upload with duplicates
          </button>
        </div>
      </div>
    </div>
  );
}

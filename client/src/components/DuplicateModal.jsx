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
          ×
        </button>
        <h2 className="dup-modal-title">Duplicate Entries Detected</h2>
        <p className="dup-modal-copy">Uploaded dataset rows: {modal.totalRows}</p>
        <p className="dup-modal-copy">Duplicate entry codes: {modal.duplicateCount}</p>
        <p className="dup-modal-copy">
          In-file duplicates: {modal.fileDuplicateCount} &nbsp;|&nbsp; Already in database: {modal.existingDuplicateCount}
        </p>
        <div className="dup-modal-actions">
          <button type="button" className="warn-btn" onClick={onUploadWith}>
            Upload with duplicates
          </button>
          <button type="button" className="btn-primary action-btn" onClick={onUploadWithout}>
            Upload without duplicates
          </button>
        </div>
      </div>
    </div>
  );
}

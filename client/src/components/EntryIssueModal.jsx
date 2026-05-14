import { useMemo, useState } from 'react';

const FIELDS = ['employeeId', 'fullName', 'department', 'email', 'entryCode'];

const fieldLabels = {
  employeeId: 'Employee ID',
  fullName: 'Full name',
  department: 'Department',
  email: 'Email',
  entryCode: 'Entry code'
};

export default function EntryIssueModal({ rows, onResolve, resolving }) {
  const [draftRows, setDraftRows] = useState(() =>
    rows.map((row) => ({ ...row, action: 'edit' }))
  );

  const counts = useMemo(() => draftRows.reduce((acc, row) => {
    acc[row.action] = (acc[row.action] || 0) + 1;
    return acc;
  }, {}), [draftRows]);

  const updateRow = (rowNumber, patch) => {
    setDraftRows((current) => current.map((row) => (
      row.rowNumber === rowNumber ? { ...row, ...patch } : row
    )));
  };

  const applyAll = (action) => {
    setDraftRows((current) => current.map((row) => ({ ...row, action })));
  };

  return (
    <div className="dup-modal-backdrop">
      <div className="dup-modal entry-issue-modal">
        <div className="dup-modal-scroll">
          <h2 className="dup-modal-title">Entry Rows Need Review</h2>
          <p className="dup-modal-copy">Fix invalid fields, keep them as-is, or delete rows from this upload.</p>

          <div className="dup-modal-stats">
            <div className="dup-stat">
              <span className="dup-stat-label">Rows</span>
              <strong className="dup-stat-value">{draftRows.length}</strong>
            </div>
            <div className="dup-stat">
              <span className="dup-stat-label">Edit</span>
              <strong className="dup-stat-value">{counts.edit || 0}</strong>
            </div>
            <div className="dup-stat">
              <span className="dup-stat-label">Keep</span>
              <strong className="dup-stat-value">{counts.keep || 0}</strong>
            </div>
            <div className="dup-stat">
              <span className="dup-stat-label">Delete</span>
              <strong className="dup-stat-value">{counts.delete || 0}</strong>
            </div>
          </div>

          <div className="entry-issue-toolbar">
            <button type="button" className="btn-ghost" onClick={() => applyAll('edit')}>Edit all</button>
            <button type="button" className="btn-ghost" onClick={() => applyAll('keep')}>Keep all</button>
            <button type="button" className="btn-ghost" onClick={() => applyAll('delete')}>Delete all</button>
          </div>

          <div className="entry-issue-list">
            {draftRows.map((row) => (
              <div key={row.rowNumber} className={`entry-issue-row entry-issue-row--${row.action}`}>
                <div className="split-row">
                  <div>
                    <p className="card-subheading">Row {row.rowNumber}</p>
                    <p className="tiny-copy">{row.issues?.join(' | ') || 'Needs review'}</p>
                  </div>
                  <select
                    className="entries-filter"
                    value={row.action}
                    onChange={(e) => updateRow(row.rowNumber, { action: e.target.value })}
                  >
                    <option value="edit">Edit and save</option>
                    <option value="keep">Keep as-is</option>
                    <option value="delete">Delete row</option>
                  </select>
                </div>

                <div className="entry-issue-fields">
                  {FIELDS.map((field) => (
                    <label key={field} className="field">
                      <span className="field-label">{fieldLabels[field]}</span>
                      <input
                        className="event-input"
                        value={row[field] || ''}
                        disabled={row.action === 'delete'}
                        onChange={(e) => updateRow(row.rowNumber, { [field]: e.target.value, action: 'edit' })}
                      />
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="dup-modal-actions">
          <button type="button" className="btn-primary action-btn" disabled={resolving} onClick={() => onResolve(draftRows)}>
            {resolving ? 'Applying...' : 'Apply decisions'}
          </button>
        </div>
      </div>
    </div>
  );
}

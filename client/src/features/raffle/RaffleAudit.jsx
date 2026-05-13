import { useEffect, useState } from 'react';
import { fetchEventAudit } from '@/features/entry-upload/entryUpload.service';
import { exportAuditCsv, exportAuditPdf } from './auditExport';

const ACTION_LABELS = {
  event_created: 'Event created',
  entry_upload_started: 'Entry upload started',
  entry_upload_validated: 'Entry upload validated',
  entry_upload_completed: 'Entry upload completed',
  deduplication_review_required: 'Deduplication review required',
  deduplication_run: 'Deduplication run',
  manual_entry_added: 'Manual entry added',
  draw_initiated: 'Draw initiated',
  winner_confirmed: 'Winner confirmed',
  redraw_logged: 'Redraw logged',
  winners_reset: 'Winner history reset'
};

function describeDetails(details) {
  if (!details) return '';
  if (details.winner?.fullName) return `${details.winner.fullName} (${details.winner.employeeId})`;
  if (details.newWinner?.fullName) return `${details.originalWinner?.fullName || 'Original winner'} redrawn to ${details.newWinner.fullName}`;
  if (details.fileName) return `${details.fileName}`;
  if (details.insertedRows != null) return `${details.insertedRows} inserted, ${details.skippedRows ?? 0} skipped`;
  if (details.entryCode) return `${details.fullName || details.employeeId} / ${details.entryCode}`;
  return JSON.stringify(details);
}

export function RaffleAudit({ selectedEvent, refreshKey = 0 }) {
  const [summary, setSummary] = useState({ event: null, entryCount: 0, logs: [] });
  const [error, setError] = useState('');

  useEffect(() => {
    if (!selectedEvent?.id) return;
    let current = true;
    fetchEventAudit(selectedEvent.id)
      .then((data) => {
        if (!current) return;
        setSummary(data);
        setError('');
      })
      .catch((err) => {
        if (current) setError(err.message);
      });
    return () => {
      current = false;
    };
  }, [selectedEvent?.id, refreshKey]);

  if (!selectedEvent) return null;

  const logsNewestFirst = [...summary.logs].reverse();

  return (
    <div className="soft-card audit-log-card">
      <div className="split-row audit-log-header">
        <div>
          <p className="card-heading">Raffle Audit</p>
          <p className="tiny-copy">Immutable event-scoped record of uploads, deduplication, draws, confirmations, redraws, and overrides.</p>
        </div>
        <div className="audit-export-actions">
          <button type="button" className="btn-ghost" onClick={() => exportAuditCsv(summary)} disabled={summary.logs.length === 0}>Export CSV</button>
          <button type="button" className="btn-ghost" onClick={() => exportAuditPdf(summary)} disabled={summary.logs.length === 0}>Export PDF</button>
        </div>
      </div>

      <div className="audit-summary-row">
        <span className="pill pill--neutral">Entries: {summary.entryCount}</span>
        <span className="pill pill--accent">Audit records: {summary.logs.length}</span>
      </div>

      {error && <div className="error-card">{error}</div>}

      <div className="audit-table-wrap">
        <table className="audit-table">
          <thead>
            <tr>
              <th>Time</th>
              <th>Action</th>
              <th>Operator</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {logsNewestFirst.length === 0 ? (
              <tr><td colSpan="4">No audit records yet.</td></tr>
            ) : logsNewestFirst.map((log) => (
              <tr key={log.id}>
                <td>{new Date(log.createdAt).toLocaleString()}</td>
                <td>{ACTION_LABELS[log.action] || log.action}</td>
                <td>{log.operator}</td>
                <td>{describeDetails(log.details)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

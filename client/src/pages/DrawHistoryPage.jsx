import { useEffect, useState, useCallback } from 'react';
import { PageShell } from './PageShell';
import { fetchDraws, voidDraw } from '@/features/draws/draws.service';
import { fetchEvents } from '@/features/entry-upload/entryUpload.service';

const STATUSES = ['CONFIRMED', 'RESET', 'VOIDED'];

function StatusBadge({ status }) {
  const cls = status === 'CONFIRMED' ? 'status-active' : status === 'VOIDED' ? 'status-completed' : 'status-draft';
  return <span className={`event-status-pill ${cls}`}><span className="status-dot" />{status}</span>;
}

function DrawRow({ draw, onVoid }) {
  const [expanded, setExpanded] = useState(false);
  const reasonOpen = expanded;
  return (
    <div className="event-card-row" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div style={{ flex: 2 }}>
          <strong>{draw.entry?.fullName || draw.entryId}</strong>
          <p className="tiny-copy">{draw.event?.name || draw.eventId}</p>
        </div>
        <div style={{ flex: 1 }}>{draw.prizeCategory?.name || '—'}</div>
        <div style={{ flex: 1 }}>{draw.operator}</div>
        <div style={{ flex: 1 }}><StatusBadge status={draw.status} /></div>
        <div style={{ flex: 1 }} className="tiny-copy">{new Date(draw.createdAt).toLocaleString()}</div>
        <div>
          <button type="button" className="btn-ghost-sm" onClick={() => setExpanded((v) => !v)}>{expanded ? 'Hide' : 'Details'}</button>
        </div>
      </div>
      {reasonOpen && (
        <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: 'rgba(0,0,0,0.04)', borderRadius: '8px' }}>
          <p className="tiny-copy"><strong>Fingerprint:</strong> <code>{draw.rngFingerprint}</code></p>
          {draw.ruleSnapshot && (
            <p className="tiny-copy"><strong>Rules applied:</strong> {Object.keys(draw.ruleSnapshot).length ? Object.keys(draw.ruleSnapshot).join(', ') : 'default'}</p>
          )}
          {draw.voidReason && <p className="tiny-copy"><strong>Void reason:</strong> {draw.voidReason}</p>}
          {draw.status === 'CONFIRMED' && (
            <button
              type="button"
              className="btn-ghost-sm"
              style={{ marginTop: '0.5rem' }}
              onClick={() => onVoid(draw)}
            >
              Void this winner
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function DrawHistoryPage() {
  const [draws, setDraws] = useState([]);
  const [events, setEvents] = useState([]);
  const [eventFilter, setEventFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchDraws({ eventId: eventFilter || undefined, status: statusFilter || undefined });
      setDraws(data.items || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [eventFilter, statusFilter]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { fetchEvents().then(setEvents).catch(() => {}); }, []);

  async function onVoid(draw) {
    const reason = window.prompt('Void reason (min 10 characters):');
    if (!reason || reason.trim().length < 10) {
      window.alert('Reason must be at least 10 characters.');
      return;
    }
    try {
      await voidDraw(draw.id, reason.trim());
      load();
    } catch (e) {
      setError(e.message);
    }
  }

  function exportCsv() {
    const params = new URLSearchParams();
    if (eventFilter) params.set('eventId', eventFilter);
    if (statusFilter) params.set('status', statusFilter);
    params.set('format', 'csv');
    window.open(`/api/draws/export?${params.toString()}`, '_blank');
  }

  return (
    <PageShell breadcrumb="Dashboard / Draws" title="Draw History" subtitle="Every confirmed, reset, or voided draw across all events.">
      <div className="event-filters-row">
        <select className="event-sort-select" value={eventFilter} onChange={(e) => setEventFilter(e.target.value)}>
          <option value="">All events</option>
          {events.map((ev) => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
        </select>
        <select className="event-sort-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <button type="button" className="btn-ghost" onClick={exportCsv}>Export CSV</button>
      </div>

      {error && <div className="error-card" style={{ marginTop: '1rem' }}>{error}</div>}

      <div className="event-list-header" style={{ marginTop: '1rem' }}>
        <div style={{ flex: 2 }}>WINNER</div>
        <div style={{ flex: 1 }}>CATEGORY</div>
        <div style={{ flex: 1 }}>OPERATOR</div>
        <div style={{ flex: 1 }}>STATUS</div>
        <div style={{ flex: 1 }}>DRAWN AT</div>
        <div></div>
      </div>

      {loading ? (
        <p className="tiny-copy" style={{ padding: '1rem' }}>Loading...</p>
      ) : draws.length === 0 ? (
        <p className="tiny-copy" style={{ padding: '1rem' }}>No draws yet.</p>
      ) : (
        draws.map((d) => <DrawRow key={d.id} draw={d} onVoid={onVoid} />)
      )}
    </PageShell>
  );
}

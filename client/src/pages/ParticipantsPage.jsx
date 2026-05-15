import { useEffect, useState, useCallback } from 'react';
import { PageShell } from './PageShell';
import {
  fetchParticipants,
  fetchParticipantDetail,
  updateParticipant,
  fetchParticipantFacets
} from '@/features/participants/participants.service';
import { fetchEvents } from '@/features/entry-upload/entryUpload.service';

const STATUSES = ['ACTIVE', 'INACTIVE', 'EXCLUDED'];

function StatusPill({ status }) {
  const colorClass = status === 'ACTIVE' ? 'status-active' : status === 'EXCLUDED' ? 'status-completed' : 'status-draft';
  return <span className={`event-status-pill ${colorClass}`}><span className="status-dot" />{status}</span>;
}

function ParticipantDetail({ participant, onClose, onUpdate }) {
  const [status, setStatus] = useState(participant.status);
  const [tagsText, setTagsText] = useState((participant.tags || []).join(', '));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSave() {
    setSaving(true);
    setError('');
    try {
      const updated = await updateParticipant(participant.id, {
        status,
        tags: tagsText.split(',').map((t) => t.trim()).filter(Boolean)
      });
      onUpdate(updated);
      onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="participant-detail-drawer">
      <div className="participant-detail-header">
        <p className="card-heading">{participant.firstName || ''} {participant.lastName || ''}</p>
        <button type="button" className="btn-ghost-sm" onClick={onClose}>Close</button>
      </div>
      <div className="participant-detail-body">
        <p className="tiny-copy"><strong>Employee ID:</strong> {participant.employeeId || '—'}</p>
        <p className="tiny-copy"><strong>Email:</strong> {participant.email}</p>
        <p className="tiny-copy"><strong>Department:</strong> {participant.rawData?.department || participant.role || '—'}</p>
        <p className="tiny-copy"><strong>Created:</strong> {new Date(participant.createdAt).toLocaleString()}</p>

        <label className="field-label" style={{ marginTop: '1rem' }}>Status</label>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="event-sort-select">
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>

        <label className="field-label" style={{ marginTop: '1rem' }}>Tags (comma-separated)</label>
        <input type="text" className="event-input" value={tagsText} onChange={(e) => setTagsText(e.target.value)} />

        {participant.entries?.length > 0 && (
          <>
            <p className="card-subheading" style={{ marginTop: '1.25rem' }}>Entry history</p>
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {participant.entries.map((entry) => (
                <li key={entry.id} className="tiny-copy">
                  {entry.event?.name || entry.eventId} — {entry.entryCode} ({new Date(entry.createdAt).toLocaleDateString()})
                </li>
              ))}
            </ul>
          </>
        )}

        {participant.winners?.length > 0 && (
          <>
            <p className="card-subheading" style={{ marginTop: '1.25rem' }}>Prizes won</p>
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {participant.winners.map((w) => (
                <li key={w.id} className="tiny-copy">
                  {w.event?.name || w.eventId} — {w.prizeCategory?.name || 'Uncategorized'} ({w.status})
                </li>
              ))}
            </ul>
          </>
        )}

        {error && <div className="error-card" style={{ marginTop: '1rem' }}>{error}</div>}
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
          <button type="button" className="btn-primary action-btn" disabled={saving} onClick={handleSave}>{saving ? 'Saving...' : 'Save'}</button>
          <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

export function ParticipantsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [eventFilter, setEventFilter] = useState('');
  const [events, setEvents] = useState([]);
  const [facets, setFacets] = useState({ statusCounts: {}, total: 0 });
  const [items, setItems] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [nextCursor, setNextCursor] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [detail, setDetail] = useState(null);

  const load = useCallback(async (resetCursor = true) => {
    setLoading(true);
    setError('');
    try {
      const result = await fetchParticipants({
        search,
        status: statusFilter || undefined,
        eventId: eventFilter || undefined,
        cursor: resetCursor ? null : cursor,
        limit: 50
      });
      setItems(resetCursor ? result.items : [...items, ...result.items]);
      setNextCursor(result.nextCursor);
      if (resetCursor) setCursor(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, eventFilter, cursor, items]);

  useEffect(() => { load(true); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [search, statusFilter, eventFilter]);
  useEffect(() => {
    fetchParticipantFacets().then(setFacets).catch(() => {});
    fetchEvents().then(setEvents).catch(() => {});
  }, []);

  async function openDetail(id) {
    try {
      const d = await fetchParticipantDetail(id);
      setDetail(d);
    } catch (e) {
      setError(e.message);
    }
  }

  function onUpdate(updated) {
    setItems((prev) => prev.map((p) => (p.id === updated.id ? { ...p, ...updated } : p)));
  }

  return (
    <PageShell
      breadcrumb="Dashboard / Participants"
      title="Participants"
      subtitle="Master employee registry across all events."
    >
      <section className="kpi-grid">
        <article className="kpi-card">
          <p className="kpi-label">Total</p>
          <p className="kpi-value kpi-value--sm">{facets.total ?? 0}</p>
        </article>
        <article className="kpi-card">
          <p className="kpi-label">Active</p>
          <p className="kpi-value kpi-value--sm">{facets.statusCounts?.ACTIVE ?? 0}</p>
        </article>
        <article className="kpi-card">
          <p className="kpi-label">Inactive</p>
          <p className="kpi-value kpi-value--sm">{facets.statusCounts?.INACTIVE ?? 0}</p>
        </article>
        <article className="kpi-card">
          <p className="kpi-label">Excluded</p>
          <p className="kpi-value kpi-value--sm">{facets.statusCounts?.EXCLUDED ?? 0}</p>
        </article>
      </section>

      <div className="event-filters-row" style={{ marginTop: '1.25rem' }}>
        <div className="event-search-wrapper">
          <input
            type="text"
            className="event-search-input"
            placeholder="Search by name, email, employee ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="event-sort-wrap" style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <select className="event-sort-select" value={eventFilter} onChange={(e) => setEventFilter(e.target.value)}>
            <option value="">All events</option>
            {events.map((event) => (
              <option key={event.id} value={event.id}>{event.name}</option>
            ))}
          </select>
          <select className="event-sort-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All statuses</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {error && <div className="error-card" style={{ marginTop: '1rem' }}>{error}</div>}

      <div className="participant-table" style={{ marginTop: '1rem' }}>
        <div className="event-list-header">
          <div style={{ flex: 2 }}>NAME</div>
          <div style={{ flex: 2 }}>EMAIL</div>
          <div style={{ flex: 1 }}>EMPLOYEE ID</div>
          <div style={{ flex: 1 }}>STATUS</div>
          <div style={{ flex: 1, textAlign: 'right' }}>ACTIONS</div>
        </div>
        {items.length === 0 && !loading ? (
          <p className="tiny-copy" style={{ padding: '1rem' }}>
            No participants yet. They appear here automatically once you upload entries.
          </p>
        ) : (
          items.map((p) => (
            <div key={p.id} className="event-card-row">
              <div style={{ flex: 2 }}>
                <strong>{[p.firstName, p.lastName].filter(Boolean).join(' ') || '—'}</strong>
              </div>
              <div style={{ flex: 2 }}>{p.email}</div>
              <div style={{ flex: 1 }}>{p.employeeId || '—'}</div>
              <div style={{ flex: 1 }}><StatusPill status={p.status} /></div>
              <div style={{ flex: 1, textAlign: 'right' }}>
                <button type="button" className="btn-ghost-sm" onClick={() => openDetail(p.id)}>Open</button>
              </div>
            </div>
          ))
        )}
        {loading && <p className="tiny-copy" style={{ padding: '1rem' }}>Loading...</p>}
        {nextCursor && !loading && (
          <button type="button" className="btn-ghost" style={{ marginTop: '0.75rem' }} onClick={() => { setCursor(nextCursor); load(false); }}>Load more</button>
        )}
      </div>

      {detail && <ParticipantDetail participant={detail} onClose={() => setDetail(null)} onUpdate={onUpdate} />}
    </PageShell>
  );
}

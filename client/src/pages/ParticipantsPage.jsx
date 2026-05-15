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
  const [filteredTotal, setFilteredTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [detail, setDetail] = useState(null);

  const load = useCallback(async (page = 1) => {
    setLoading(true);
    setError('');
    try {
      const result = await fetchParticipants({
        search,
        status: statusFilter || undefined,
        eventId: eventFilter || undefined,
        page,
        limit: 50
      });
      setItems(result.items);
      setFilteredTotal(result.total || 0);
      setTotalPages(result.totalPages);
      setCurrentPage(page);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, eventFilter]);

  useEffect(() => { load(1); }, [search, statusFilter, eventFilter]);
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
      <section className="kpi-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        {eventFilter && (
          <article className="kpi-card" style={{ borderColor: 'var(--accent)' }}>
            <p className="kpi-label" style={{ color: 'var(--accent)' }}>Event Participants</p>
            <p className="kpi-value kpi-value--sm">{filteredTotal.toLocaleString()}</p>
            <p className="tiny-copy">{events.find(e => e.id === eventFilter)?.name}</p>
          </article>
        )}
        <article className="kpi-card">
          <p className="kpi-label">{eventFilter ? 'Global Total' : 'Total'}</p>
          <p className="kpi-value kpi-value--sm">{(facets.total ?? 0).toLocaleString()}</p>
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
            placeholder="Search by name, employee ID..."
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

      <div className="participant-table" style={{ marginTop: '1rem', position: 'relative' }}>
        <div className="event-list-header">
          <div style={{ flex: 2 }}>NAME</div>
          <div style={{ flex: 2 }}>EMAIL</div>
          <div style={{ flex: 1 }}>EMPLOYEE ID</div>
          <div style={{ flex: 1 }}>STATUS</div>
          <div style={{ flex: 1, textAlign: 'right' }}>ACTIONS</div>
        </div>
        <div style={{ maxHeight: '400px', overflowY: 'auto', position: 'relative', paddingBottom: '1rem' }}>
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
          {loading && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(17,18,20,0.8)', color: '#f8fafc', fontWeight: 600, borderRadius: '12px', pointerEvents: 'none' }}>
              Loading...
            </div>
          )}
        </div>
        {totalPages > 1 && (
          <div style={{ position: 'sticky', bottom: 0, zIndex: 10, background: '#0b0b0d', paddingTop: '1rem', paddingBottom: '0.5rem', marginTop: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
              <button type="button" className="btn-ghost-sm" onClick={() => load(currentPage - 1)} disabled={currentPage === 1}>Previous</button>
              <button type="button" className={currentPage === 1 ? 'btn-primary' : 'btn-ghost-sm'} onClick={() => load(1)} disabled={currentPage === 1}>1</button>
              {totalPages > 2 && currentPage > 4 && (
                <span className="tiny-copy" style={{ padding: '0.5rem 0.75rem' }}>…</span>
              )}
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((page) => {
                  if (totalPages <= 9) return true;
                  if (page <= 2 || page > totalPages - 2) return true;
                  return Math.abs(page - currentPage) <= 1;
                })
                .map((page) => {
                  if (page === 1 || page === totalPages) return null;
                  return (
                    <button
                      key={page}
                      type="button"
                      className={page === currentPage ? 'btn-primary' : 'btn-ghost-sm'}
                      onClick={() => load(page)}
                      disabled={page === currentPage}
                    >
                      {page}
                    </button>
                  );
                })}
              {totalPages > 4 && currentPage < totalPages - 3 && (
                <span className="tiny-copy" style={{ padding: '0.5rem 0.75rem' }}>…</span>
              )}
              {totalPages > 1 && (
                <button type="button" className={currentPage === totalPages ? 'btn-primary' : 'btn-ghost-sm'} onClick={() => load(totalPages)} disabled={currentPage === totalPages}>{totalPages}</button>
              )}
              <button type="button" className="btn-ghost-sm" onClick={() => load(currentPage + 1)} disabled={currentPage === totalPages}>Next</button>
            </div>
            <div className="tiny-copy">
              Page {currentPage} of {totalPages}
            </div>
          </div>
        )}
      </div>

      {detail && <ParticipantDetail participant={detail} onClose={() => setDetail(null)} onUpdate={onUpdate} />}
    </PageShell>
  );
}

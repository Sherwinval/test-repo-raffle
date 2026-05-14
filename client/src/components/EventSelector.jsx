import { useEffect, useState, useMemo } from 'react';
import EventCustomizationWizard from './EventCustomizationWizard';

const IconTrash = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
  </svg>
);

const IconCalendar = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.6, marginRight: '6px' }}>
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

const IconUsers = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.6, marginRight: '6px' }}>
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" />
  </svg>
);

const IconPlus = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}>
    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const IconSearch = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5, marginRight: '8px' }}>
    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const IconEdit = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}>
    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

const IconRun = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}>
    <polygon points="5 3 19 12 5 21 5 3" />
  </svg>
);

export default function EventSelector({ selectedEvent, onSelect, onDelete }) {
  const [events, setEvents] = useState([]);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [customizationOpen, setCustomizationOpen] = useState(false);
  const [customizationEvent, setCustomizationEvent] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTab, setFilterTab] = useState('All');

  const [sortOrder, setSortOrder] = useState('Newest');

  useEffect(() => {
    fetchEvents();
  }, []);

  async function fetchEvents() {
    setLoading(true);
    try {
      const res = await fetch('/api/events');
      const data = await res.json();
      // Add a mock status so the UI matches the design (Active or Draft)
      const mappedData = data.map((ev, index) => ({
        ...ev,
        status: index % 3 === 0 ? 'Draft' : 'Active',
        entriesCount: Math.floor(Math.random() * 300) + 50 // Mock entry count
      }));
      setEvents(mappedData);
    } catch {
      setError('Failed to load events.');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });
      if (!res.ok) {
        const body = await res.json();
        setError(body?.error || 'Failed to create event.');
        return;
      }
      const created = await res.json();
      const newEv = { ...created, status: 'Active', entriesCount: 0 };
      setEvents((prev) => [newEv, ...prev]);
      onSelect(newEv);
      setCustomizationEvent(newEv);
      setCustomizationOpen(true);
      setSuccessMessage(null);
      setCreating(false);
      setNewName('');
      setError(null);
    } catch {
      setError('Failed to create event.');
    }
  }

  async function handleDelete(eventId) {
    try {
      const res = await fetch(`/api/events/${eventId}`, { method: 'DELETE' });
      if (!res.ok) {
        const body = await res.json();
        setError(body?.error || 'Failed to delete event.');
        return;
      }
      setEvents((prev) => prev.filter((ev) => ev.id !== eventId));
      setDeletingId(null);
      if (selectedEvent?.id === eventId) onDelete?.();
    } catch {
      setError('Failed to delete event.');
    }
  }

  const filteredEvents = useMemo(() => {
    let result = events.filter(ev => {
      const matchesSearch = ev.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesTab = filterTab === 'All' || ev.status === filterTab || (filterTab === 'Completed' && ev.status === 'Completed');
      return matchesSearch && matchesTab;
    });

    result.sort((a, b) => {
      if (sortOrder === 'Newest') return new Date(b.createdAt) - new Date(a.createdAt);
      return new Date(a.createdAt) - new Date(b.createdAt);
    });

    return result;
  }, [events, searchTerm, filterTab, sortOrder]);

  const activeCount = events.filter(e => e.status === 'Active').length;
  const draftCount = events.filter(e => e.status === 'Draft').length;
  const completedCount = 0; // Mock

  return (
    <div className="event-dashboard-full">
      <div className="event-dashboard-header">
        <div>
          <p className="tiny-copy" style={{ marginBottom: '0.25rem', opacity: 0.6 }}>Dashboard / Events</p>
          <h1 className="title">Events</h1>
        </div>
        <div className="event-dashboard-actions">
          <div className="event-search-wrapper">
            <IconSearch />
            <input 
              type="text" 
              className="event-search-input" 
              placeholder="Search events..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button type="button" className="btn-primary" onClick={() => setCreating(true)}>
            <IconPlus /> New Event
          </button>
        </div>
      </div>

      {creating && (
        <form className="event-create-form" style={{ marginBottom: '1.5rem', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border, #2d2d30)', background: 'var(--surface, #111214)' }} onSubmit={handleCreate}>
          <input
            type="text"
            className="event-input"
            placeholder="Event name (e.g. Q2 Raffle 2026)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            autoFocus
          />
          <div className="event-create-actions" style={{ marginTop: '0.75rem' }}>
            <button type="submit" className="btn-primary action-btn" disabled={!newName.trim()}>
              Create
            </button>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => { setCreating(false); setNewName(''); }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {error && <p className="event-error" style={{ marginBottom: '1rem' }}>{error}</p>}
      {successMessage && <p className="tiny-copy" style={{ marginBottom: '1rem', color: '#22c55e' }}>{successMessage}</p>}

      <section className="kpi-grid">
        <article className="kpi-card">
          <p className="kpi-label" style={{ display: 'flex', alignItems: 'center' }}>
            <IconCalendar /> TOTAL EVENTS
          </p>
          <p className="kpi-value kpi-value--sm" style={{ marginTop: '0.5rem' }}>{events.length}</p>
          <p className="tiny-copy kpi-subcopy" style={{ marginTop: '0.25rem' }}>{activeCount} active now</p>
        </article>
        <article className="kpi-card">
          <p className="kpi-label" style={{ display: 'flex', alignItems: 'center' }}>
            <IconRun /> DRAWS RUN
          </p>
          <p className="kpi-value kpi-value--sm" style={{ marginTop: '0.5rem' }}>312</p>
          <p className="tiny-copy kpi-subcopy" style={{ marginTop: '0.25rem' }}>this month</p>
        </article>
        <article className="kpi-card">
          <p className="kpi-label" style={{ display: 'flex', alignItems: 'center' }}>
            <IconUsers /> PARTICIPANTS
          </p>
          <p className="kpi-value kpi-value--sm" style={{ marginTop: '0.5rem' }}>1,223</p>
          <p className="tiny-copy kpi-subcopy" style={{ marginTop: '0.25rem' }}>across all events</p>
        </article>
        <article className="kpi-card">
          <p className="kpi-label" style={{ display: 'flex', alignItems: 'center' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.6, marginRight: '6px' }}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg> 
            COMPLETED
          </p>
          <p className="kpi-value kpi-value--sm" style={{ marginTop: '0.5rem' }}>3</p>
          <p className="tiny-copy kpi-subcopy" style={{ marginTop: '0.25rem' }}>draws finalised</p>
        </article>
      </section>

      <div className="event-filters-row">
        <div className="tab-wrap">
          <button className={`tab-btn ${filterTab === 'All' ? 'tab-btn--active' : ''}`} onClick={() => setFilterTab('All')}>All {events.length}</button>
          <button className={`tab-btn ${filterTab === 'Active' ? 'tab-btn--active' : ''}`} onClick={() => setFilterTab('Active')}>Active {activeCount}</button>
          <button className={`tab-btn ${filterTab === 'Draft' ? 'tab-btn--active' : ''}`} onClick={() => setFilterTab('Draft')}>Draft {draftCount}</button>
          <button className={`tab-btn ${filterTab === 'Completed' ? 'tab-btn--active' : ''}`} onClick={() => setFilterTab('Completed')}>Completed {completedCount}</button>
        </div>
        
        <div className="event-sort-wrap">
          <select className="event-sort-select" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)}>
            <option value="Newest">Sort: Newest</option>
            <option value="Oldest">Sort: Oldest</option>
          </select>
        </div>
      </div>

      <div className="event-list-header">
        <div style={{ flex: 2 }}>EVENT</div>
        <div style={{ flex: 1 }}>DATE</div>
        <div style={{ flex: 1 }}>STATUS</div>
        <div style={{ flex: 1, textAlign: 'right' }}>ACTIONS</div>
      </div>

      <div className="event-card-list">
        {loading ? (
          <p className="tiny-copy" style={{ padding: '1rem' }}>Loading events...</p>
        ) : filteredEvents.length === 0 ? (
          <p className="tiny-copy" style={{ padding: '1rem' }}>No events found.</p>
        ) : (
          filteredEvents.map((ev) => (
            <div key={ev.id} className="event-card-row">
              {deletingId === ev.id ? (
                <div className="event-delete-confirm" style={{ padding: '1rem', width: '100%' }}>
                  <span className="event-delete-confirm-text">Delete &ldquo;{ev.name}&rdquo;?</span>
                  <button type="button" className="btn-danger-sm" onClick={() => handleDelete(ev.id)}>Delete</button>
                  <button type="button" className="btn-ghost-sm" onClick={() => setDeletingId(null)}>Cancel</button>
                </div>
              ) : (
                <>
                  <div className="event-card-info" style={{ flex: 2 }}>
                    <h3 className="event-card-title">{ev.name}</h3>
                    <p className="event-card-desc">Random selection among shortlisted nominees. Preference weights applied.</p>
                  </div>
                  
                  <div className="event-card-meta" style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.25rem' }}>
                      <IconCalendar />
                      <span>{new Date(ev.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', color: '#64748b' }}>
                      <IconUsers />
                      <span>{ev.entriesCount} entries</span>
                    </div>
                  </div>
                  
                  <div className="event-card-status-col" style={{ flex: 1 }}>
                    <span className={`event-status-pill status-${ev.status.toLowerCase()}`}>
                      <span className="status-dot"></span>
                      {ev.status}
                    </span>
                  </div>
                  
                  <div className="event-card-actions" style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                    <button type="button" className="btn-ghost-sm" onClick={() => { setCustomizationEvent(ev); setCustomizationOpen(true); }}>
                      <IconEdit /> Edit
                    </button>
                    <button type="button" className={`btn-primary-sm ${ev.status === 'Draft' ? 'btn-disabled' : ''}`} onClick={() => onSelect(ev)} disabled={ev.status === 'Draft' && false}>
                      <IconRun /> Run
                    </button>
                    <button type="button" className="btn-ghost-sm event-delete-icon" onClick={() => setDeletingId(ev.id)} aria-label="Delete" title="Delete Event">
                      <IconTrash />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </div>

      {customizationOpen && customizationEvent && (
        <EventCustomizationWizard
          event={customizationEvent}
          onClose={() => { setCustomizationOpen(false); setCustomizationEvent(null); }}
          onPublish={() => {
            setCustomizationOpen(false);
            setSuccessMessage('Event customization published successfully.');
            setCustomizationEvent(null);
          }}
        />
      )}
    </div>
  );
}

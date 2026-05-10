import { useEffect, useState } from 'react';

const IconTrash = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
  </svg>
);

const IconCalendar = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5 }}>
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
);

const IconPlus = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);

export default function EventSelector({ selectedEvent, onSelect, onDelete }) {
  const [events, setEvents] = useState([]);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    fetchEvents();
  }, []);

  async function fetchEvents() {
    setLoading(true);
    try {
      const res = await fetch('/api/events');
      const data = await res.json();
      setEvents(data);
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
      setEvents((prev) => [created, ...prev]);
      onSelect(created);
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
      if (selectedEvent?.id === eventId) onDelete();
    } catch {
      setError('Failed to delete event.');
    }
  }

  return (
    <div className="event-selector">
      <div className="event-selector-header">
        <p className="field-label">Raffle Event</p>
        {!creating && (
          <button type="button" className="btn-ghost-sm" onClick={() => setCreating(true)}>
            <IconPlus /> New event
          </button>
        )}
      </div>

      {error && <p className="event-error">{error}</p>}

      {creating && (
        <form className="event-create-form" onSubmit={handleCreate}>
          <input
            type="text"
            className="event-input"
            placeholder="Event name (e.g. Q2 Raffle 2026)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            autoFocus
          />
          <div className="event-create-actions">
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

      {loading ? (
        <p className="tiny-copy">Loading events...</p>
      ) : events.length === 0 && !creating ? (
        <p className="tiny-copy">No events yet. Create one to get started.</p>
      ) : (
        <div className="event-list">
          {events.map((ev) => (
            <div key={ev.id} className="event-item-row">
              {deletingId === ev.id ? (
                <div className="event-delete-confirm">
                  <span className="event-delete-confirm-text">Delete &ldquo;{ev.name}&rdquo;?</span>
                  <button
                    type="button"
                    className="btn-danger-sm"
                    onClick={() => handleDelete(ev.id)}
                  >
                    Delete
                  </button>
                  <button
                    type="button"
                    className="btn-ghost-sm"
                    onClick={() => setDeletingId(null)}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    className={`event-item${selectedEvent?.id === ev.id ? ' event-item--active' : ''}`}
                    onClick={() => onSelect(ev)}
                  >
                    <span className="event-name">{ev.name}</span>
                    <span className="event-date">
                      <IconCalendar />{' '}
                      {new Date(ev.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </button>
                  <button
                    type="button"
                    className="event-delete-btn"
                    aria-label={`Delete ${ev.name}`}
                    onClick={() => setDeletingId(ev.id)}
                  >
                    <IconTrash />
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

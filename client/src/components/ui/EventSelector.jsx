import { useEffect, useState } from 'react';
import { createEvent, deleteEvent, fetchEvents } from '@/features/entry-upload/entryUpload.service';

export const EventSelector = ({ selectedEvent, onSelect, onDeleteSelected }) => {
  const [events, setEvents] = useState([]);
  const [newName, setNewName] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchEvents().then(setEvents).catch((e) => setError(e.message));
  }, []);

  const onCreate = async (event) => {
    event.preventDefault();
    if (!newName.trim()) return;
    try {
      const created = await createEvent(newName.trim());
      setEvents((prev) => [created, ...prev]);
      onSelect(created);
      setNewName('');
      setError('');
    } catch (err) {
      setError(err.message);
    }
  };

  const onDelete = async (eventId) => {
    try {
      await deleteEvent(eventId);
      setEvents((prev) => prev.filter((item) => item.id !== eventId));
      if (selectedEvent?.id === eventId) onDeleteSelected();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <section>
      <h3>Event</h3>
      {error && <p className="error-text">{error}</p>}
      <form className="row" onSubmit={onCreate}>
        <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="New event name" />
        <button type="submit">Create event</button>
      </form>
      <div className="event-list">
        {events.map((event) => (
          <div key={event.id} className="event-item-row">
            <button type="button" className={selectedEvent?.id === event.id ? 'active-pill' : 'pill'} onClick={() => onSelect(event)}>
              {event.name}
            </button>
            <button type="button" onClick={() => onDelete(event.id)}>Delete</button>
          </div>
        ))}
      </div>
    </section>
  );
};

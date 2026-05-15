import EventSelector from '@/components/EventSelector';

export function EventsListPage({ navigate }) {
  return (
    <EventSelector
      onSelect={(event, run = false) => navigate(`/events/${event.id}${run ? '?run=true' : ''}`)}
    />
  );
}

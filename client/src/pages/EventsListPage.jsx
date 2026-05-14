import EventSelector from '@/components/EventSelector';

export function EventsListPage({ navigate }) {
  return (
    <EventSelector
      onSelect={(event) => navigate(`/events/${event.id}`)}
    />
  );
}

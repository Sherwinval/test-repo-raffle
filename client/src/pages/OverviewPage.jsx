import { useEffect, useState } from 'react';
import { PageShell } from './PageShell';
import { fetchOverview } from '@/features/overview/overview.service';

function ActionButton({ label, onClick }) {
  return <button type="button" className="btn-primary action-btn" onClick={onClick}>{label}</button>;
}

function getActivitySubject(entry) {
  const eventName = entry.event?.name;

  switch (entry.action) {
    case 'winner_confirmed':
      return eventName ? `Selected winner on ${eventName}` : 'Selected winner';
    case 'draw_initiated':
      return eventName ? `Started draw on ${eventName}` : 'Started draw';
    case 'manual_entry_added': {
      const count = entry.count || 1;
      const plural = count === 1 ? 'entry' : 'entries';
      return eventName
        ? `Added ${count} manual ${plural} to ${eventName}`
        : `Added ${count} manual ${plural}`;
    }
    case 'redraw_logged':
      return eventName ? `Logged redraw on ${eventName}` : 'Logged redraw';
    case 'winners_reset':
      return eventName ? `Cleared winners on ${eventName}` : 'Cleared winners';
    default: {
      const friendlyAction = entry.action.replace(/_/g, ' ');
      return eventName ? `${friendlyAction} on ${eventName}` : friendlyAction;
    }
  }
}

function groupRecentActivities(recent) {
  const grouped = new Map();

  for (const entry of recent) {
    if (entry.action === 'manual_entry_added' && entry.eventId) {
      const key = `manual_entry_added:${entry.eventId}`;
      const existing = grouped.get(key);

      if (existing) {
        existing.count += 1;
        if (new Date(entry.createdAt) > new Date(existing.createdAt)) {
          existing.createdAt = entry.createdAt;
        }
      } else {
        grouped.set(key, { ...entry, count: 1 });
      }
    } else {
      grouped.set(`log:${entry.id}`, entry);
    }
  }

  return Array.from(grouped.values()).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function ActivityCard({ entry }) {
  const subject = getActivitySubject(entry);
  const createdAt = new Date(entry.createdAt);
  const date = createdAt.toLocaleDateString();
  const time = createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="overview-activity-card">
      <div className="overview-activity-action">{subject}</div>
      <div className="overview-activity-meta">
        <span>{date}</span>
        <span className="overview-activity-separator">·</span>
        <span>{time}</span>
      </div>
    </div>
  );
}

export function OverviewPage({ navigate }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      fetchOverview()
        .then((d) => !cancelled && setData(d))
        .catch((e) => !cancelled && setError(e.message || 'Failed to load overview.'));
    };
    load();
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') load();
    }, 30000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const counts = data?.counts || {};
  const myEvents = data?.myEvents || [];
  const recent = groupRecentActivities(data?.recentActivity || []);

  return (
    <PageShell
      breadcrumb="Dashboard"
      title="Overview"
      subtitle="At-a-glance snapshot of the entire raffle system."
      actions={
        <>
          <ActionButton label="New Event" onClick={() => navigate('/events')} />
        </>
      }
    >
      {error && <div className="error-card" style={{ marginBottom: '1rem' }}>{error}</div>}

      <section className="kpi-grid">
        <article className="kpi-card">
          <p className="kpi-label">Participants</p>
          <p className="kpi-value kpi-value--sm">{(counts.participants ?? 0).toLocaleString()}</p>
          <p className="tiny-copy kpi-subcopy">in master registry</p>
        </article>
        <article className="kpi-card">
          <p className="kpi-label">Events</p>
          <p className="kpi-value kpi-value--sm">{counts.events ?? 0}</p>
          <p className="tiny-copy kpi-subcopy">{counts.eventsLast30 ?? 0} in last 30 days</p>
        </article>
        <article className="kpi-card">
          <p className="kpi-label">Draws</p>
          <p className="kpi-value kpi-value--sm">{counts.draws ?? 0}</p>
          <p className="tiny-copy kpi-subcopy">{counts.winners ?? 0} winners confirmed</p>
        </article>
        <article className="kpi-card">
          <p className="kpi-label">Entries</p>
          <p className="kpi-value kpi-value--sm">{(counts.entries ?? 0).toLocaleString()}</p>
          <p className="tiny-copy kpi-subcopy">across all events</p>
        </article>
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1.5rem' }}>
        <div className="soft-card">
          <p className="card-heading">Recent Activity</p>
          {recent.length === 0 ? (
            <p className="tiny-copy">No activity yet.</p>
          ) : (
            <div className="overview-activity-list">
              {recent.map((entry) => (
                <ActivityCard key={entry.id} entry={entry} />
              ))}
            </div>
          )}
        </div>

        <div className="soft-card">
          <p className="card-heading">Your Events</p>
          {myEvents.length === 0 ? (
            <div>
              <p className="tiny-copy">No events yet.</p>
              <button type="button" className="btn-primary action-btn" style={{ marginTop: '0.75rem' }} onClick={() => navigate('/events')}>Create your first event</button>
            </div>
          ) : (
            <div className="overview-events-list">
              {myEvents.map((ev) => (
                <div key={ev.id} className="overview-event-card">
                  <a href={`#/events/${ev.id}`} className="overview-event-name">{ev.name}</a>
                  <div className="overview-event-meta">
                    <span>{ev.entryCount} entries</span>
                    <span>{ev.winnerCount} winners</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </PageShell>
  );
}

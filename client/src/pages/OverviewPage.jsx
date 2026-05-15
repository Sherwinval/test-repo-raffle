import { useEffect, useState } from 'react';
import { PageShell } from './PageShell';
import { fetchOverview } from '@/features/overview/overview.service';

function ActionButton({ label, onClick }) {
  return <button type="button" className="btn-primary action-btn" onClick={onClick}>{label}</button>;
}

function ActivityRow({ entry }) {
  const subject = entry.event?.name ? `${entry.event.name} · ${entry.action}` : entry.action;
  return (
    <li className="overview-activity-row">
      <span className="overview-activity-action">{subject}</span>
      <span className="tiny-copy">{new Date(entry.createdAt).toLocaleString()}</span>
    </li>
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
  const recent = data?.recentActivity || [];

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
            <ul className="overview-activity-list" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {recent.map((entry) => (
                <ActivityRow key={entry.id} entry={entry} />
              ))}
            </ul>
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
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {myEvents.map((ev) => (
                <li key={ev.id} className="overview-activity-row">
                  <a href={`#/events/${ev.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>{ev.name}</a>
                  <span className="tiny-copy">{ev.entryCount} entries · {ev.winnerCount} winners</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </PageShell>
  );
}

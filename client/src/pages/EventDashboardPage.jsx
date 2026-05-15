import { useEffect, useRef, useState } from 'react';
import { TabNavigator } from '@/components/TabNavigator';
import { EntryUpload } from '@/features/entry-upload/EntryUpload';
import { RaffleRandomizer } from '@/features/raffle/RaffleRandomizer';
import { RaffleAudit } from '@/features/raffle/RaffleAudit';
import { fetchEvents } from '@/features/entry-upload/entryUpload.service';

const EVENT_DASHBOARD_TABS = [
  { id: 'entries', label: 'Entries' },
  { id: 'raffle', label: 'Raffle' },
  { id: 'audit', label: 'Audit' }
];

export function EventDashboardPage({ eventId, navigate, params }) {
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [error, setError] = useState('');
  const [activeEventTab, setActiveEventTab] = useState('entries');
  const [uploadStats, setUploadStats] = useState({ entryCount: 0 });
  const [uploadState, setUploadState] = useState({ status: 'idle', isActive: false });
  const [raffleStats, setRaffleStats] = useState({ total: 0, eligible: 0, drawn: 0 });
  const [isDrawSpinning, setIsDrawSpinning] = useState(false);
  const [auditRefreshKey, setAuditRefreshKey] = useState(0);
  const raffleRandomizerRef = useRef(null);

  useEffect(() => {
    if (!eventId) return;
    let cancelled = false;
    fetchEvents()
      .then((events) => {
        if (cancelled) return;
        const found = events.find((e) => e.id === eventId);
        if (!found) {
          setError('Event not found.');
          return;
        }
        setSelectedEvent(found);
      })
      .catch((e) => !cancelled && setError(e.message || 'Failed to load event.'));
    return () => {
      cancelled = true;
    };
  }, [eventId]);

  useEffect(() => {
    if (params?.run === 'true' && selectedEvent) {
      setActiveEventTab('raffle');
      setTimeout(() => {
        raffleRandomizerRef.current?.enterFullScreen();
      }, 500);
    }
  }, [params?.run, selectedEvent]);

  const workflowStep = !selectedEvent ? 'Loading' : raffleStats.drawn > 0 ? 'Review Winners' : 'Run Draw';
  const uploadLockStatuses = new Set(['uploading', 'parsing', 'pending', 'validating', 'saving', 'processing', 'canceling', 'reconnecting']);
  const isUploadLocked = uploadLockStatuses.has(uploadState.status);
  const interactionLocked = isDrawSpinning || isUploadLocked;
  const lockMessage = isDrawSpinning ? 'Drawing winner. Please wait...' : 'Uploading entries. Please wait...';

  if (error) {
    return (
      <div className="soft-card" style={{ padding: '2rem', textAlign: 'center' }}>
        <p className="card-heading">{error}</p>
        <button type="button" className="btn-primary action-btn" onClick={() => navigate('/events')}>Back to Events</button>
      </div>
    );
  }

  if (!selectedEvent) {
    return (
      <div className="soft-card" style={{ padding: '2rem' }}>
        <p className="tiny-copy">Loading event...</p>
      </div>
    );
  }

  return (
    <>
      <header className="dashboard-header">
        <div>
          <p className="tiny-copy" style={{ marginBottom: '0.25rem', opacity: 0.6 }}>
            <a href="#/events" style={{ color: 'inherit', textDecoration: 'none' }}>Dashboard / Events</a> / {selectedEvent.name}
          </p>
          <h1 className="title">{selectedEvent.name} Dashboard</h1>
          <p className="subtitle">
            Manage entries, run the draw, and review its audit trail in one scoped workspace.
          </p>
        </div>
        <span className="status-chip">Event selected</span>
      </header>

      <section className="kpi-grid">
        <article className="kpi-card">
          <p className="kpi-label">Current Section</p>
          <p className="kpi-value kpi-value--sm">Event Dashboard</p>
        </article>
        <article className="kpi-card">
          <p className="kpi-label">Active Event</p>
          <p className="kpi-value kpi-value--sm">{selectedEvent.name}</p>
          <p className="tiny-copy kpi-subcopy">Participants: {(uploadStats.entryCount ?? raffleStats.total ?? 0).toLocaleString()}</p>
        </article>
        <article className="kpi-card">
          <p className="kpi-label">Workflow</p>
          <p className="kpi-value kpi-value--sm">{workflowStep}</p>
          <p className="tiny-copy kpi-subcopy">Drawn winners: {raffleStats.drawn}</p>
        </article>
      </section>

      <section className="dashboard-panel">
        <section>
          <EntryUpload
            selectedEvent={selectedEvent}
            onSelectEvent={setSelectedEvent}
            onDeleteSelectedEvent={() => navigate('/')}
            onStatsChange={setUploadStats}
            onUploadStateChange={setUploadState}
            onAuditChange={() => setAuditRefreshKey((key) => key + 1)}
            showEntriesTable={false}
            showEntryTools={false}
            showEventSelector={false}
            enableUploadLogic={false}
          />
        </section>

        <TabNavigator
          tabs={EVENT_DASHBOARD_TABS}
          activeTabId={activeEventTab}
          onTabChange={setActiveEventTab}
        />

        <section hidden={activeEventTab !== 'entries'}>
          <EntryUpload
            selectedEvent={selectedEvent}
            onSelectEvent={setSelectedEvent}
            onDeleteSelectedEvent={() => navigate('/')}
            onStatsChange={setUploadStats}
            onUploadStateChange={setUploadState}
            onAuditChange={() => setAuditRefreshKey((key) => key + 1)}
            showEntriesTable
            showEntryTools
            showEventSelector={false}
            enableUploadLogic
          />
        </section>

        <section hidden={activeEventTab !== 'raffle'}>
          <RaffleRandomizer
            ref={raffleRandomizerRef}
            selectedEvent={selectedEvent}
            uploadState={uploadState}
            onStatsChange={setRaffleStats}
            onSpinStateChange={setIsDrawSpinning}
            onAuditChange={() => setAuditRefreshKey((key) => key + 1)}
          />
        </section>

        <section hidden={activeEventTab !== 'audit'}>
          <RaffleAudit selectedEvent={selectedEvent} refreshKey={auditRefreshKey} />
        </section>
      </section>

      {interactionLocked && (
        <div className="interaction-lock" role="status" aria-live="polite" aria-label={lockMessage}>
          <div className="interaction-lock-banner">
            <span className="button-spinner" aria-hidden="true" />
            <span>{lockMessage}</span>
          </div>
        </div>
      )}
    </>
  );
}

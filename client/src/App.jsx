import { useState } from 'react';
import { TabNavigator } from '@/components/TabNavigator';
import { EntryUpload } from '@/features/entry-upload/EntryUpload';
import { RaffleRandomizer } from '@/features/raffle/RaffleRandomizer';
import { RaffleAudit } from '@/features/raffle/RaffleAudit';

const IconDashboard = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
);
const IconSettings = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
);
const EVENT_DASHBOARD_TABS = [
  { id: 'entries', label: 'Entries' },
  { id: 'raffle', label: 'Raffle' },
  { id: 'audit', label: 'Audit' }
];

export const App = () => {
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [activeEventTab, setActiveEventTab] = useState('entries');
  const [uploadStats, setUploadStats] = useState({ entryCount: 0 });
  const [uploadState, setUploadState] = useState({ status: 'idle', isActive: false });
  const [raffleStats, setRaffleStats] = useState({ total: 0, eligible: 0, drawn: 0 });
  const [isDrawSpinning, setIsDrawSpinning] = useState(false);
  const [auditRefreshKey, setAuditRefreshKey] = useState(0);
  const workflowStep = !selectedEvent ? 'Select Event' : raffleStats.drawn > 0 ? 'Review Winners' : 'Run Draw';
  const uploadLockStatuses = new Set(['uploading', 'parsing', 'pending', 'validating', 'saving', 'processing', 'canceling', 'reconnecting']);
  const isUploadLocked = uploadLockStatuses.has(uploadState.status);
  const interactionLocked = isDrawSpinning || isUploadLocked;
  const lockMessage = isDrawSpinning ? 'Drawing winner. Please wait...' : 'Uploading entries. Please wait...';

  return (
    <div className="dashboard-shell app-root">
      <aside className="dashboard-sidebar">
        <div className="brand-block">
          <p className="brand-logo" aria-label="Rafflehub">
            <span className="brand-logo-raffle">Raffle</span>
            <span className="brand-logo-hub">Hub</span>
          </p>
        </div>
        <div className="sidebar-accent-line" />
        <p className="sidebar-label">Navigation</p>
        <button type="button" className="sidebar-link sidebar-link--active">
          <IconDashboard />
          <span>Event Dashboard</span>
        </button>
        <div className="sidebar-footer">
          <button type="button" className="sidebar-link">
            <IconSettings />
            <span>Settings</span>
          </button>
          <div className="sidebar-user">
            <span className="sidebar-user-avatar">RH</span>
            <div>
              <p className="sidebar-user-name">Raffle Operator</p>
              <p className="sidebar-user-role">Admin</p>
            </div>
          </div>
        </div>
      </aside>

      <main className="dashboard-main">
        <header className="dashboard-header">
          <div>
            <h1 className="title">Event Dashboard</h1>
            <p className="subtitle">
              Select an event, manage entries, run the draw, and review its audit trail in one scoped workspace.
            </p>
          </div>
          <span className="status-chip">{selectedEvent ? 'Event selected' : 'No event selected'}</span>
        </header>

        <section className="kpi-grid">
          <article className="kpi-card">
            <p className="kpi-label">Current Section</p>
            <p className="kpi-value kpi-value--sm">Event Dashboard</p>
          </article>
          <article className="kpi-card">
            <p className="kpi-label">Active Event</p>
            <p className="kpi-value kpi-value--sm">{selectedEvent?.name || 'No event selected'}</p>
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
              onSelectEvent={(event) => {
                setSelectedEvent(event);
                setActiveEventTab('entries');
                setAuditRefreshKey((key) => key + 1);
              }}
              onDeleteSelectedEvent={() => {
                setSelectedEvent(null);
                setActiveEventTab('entries');
                setAuditRefreshKey((key) => key + 1);
              }}
              onStatsChange={setUploadStats}
              onUploadStateChange={setUploadState}
              onAuditChange={() => setAuditRefreshKey((key) => key + 1)}
              showEntriesTable={false}
              showEntryTools={false}
              showEventSelector
              enableUploadLogic={false}
            />
          </section>

          {selectedEvent && (
            <>
              <TabNavigator
                tabs={EVENT_DASHBOARD_TABS}
                activeTabId={activeEventTab}
                onTabChange={setActiveEventTab}
              />

              <section hidden={activeEventTab !== 'entries'}>
                <EntryUpload
                  selectedEvent={selectedEvent}
                  onSelectEvent={setSelectedEvent}
                  onDeleteSelectedEvent={() => {
                    setSelectedEvent(null);
                    setActiveEventTab('entries');
                    setAuditRefreshKey((key) => key + 1);
                  }}
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
            </>
          )}
        </section>
      </main>

      {interactionLocked && (
        <div className="interaction-lock" role="status" aria-live="polite" aria-label={lockMessage}>
          <div className="interaction-lock-banner">
            <span className="button-spinner" aria-hidden="true" />
            <span>{lockMessage}</span>
          </div>
        </div>
      )}
    </div>
  );
};

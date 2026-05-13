import { useState } from 'react';
import { TabNavigator } from '@/components/TabNavigator';
import { TAB_IDS } from '@/constants/app.constants';
import { EntryUpload } from '@/features/entry-upload/EntryUpload';
import { RaffleRandomizer } from '@/features/raffle/RaffleRandomizer';

const IconDashboard = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
);
const IconRaffle = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M16 8l-4 4-4-4"/><path d="M12 12v6"/></svg>
);
const IconSettings = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
);

export const App = () => {
  const [activeTab, setActiveTab] = useState(TAB_IDS.ENTRY_UPLOAD);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [uploadStats, setUploadStats] = useState({ entryCount: 0 });
  const [uploadState, setUploadState] = useState({ status: 'idle', isActive: false });
  const [raffleStats, setRaffleStats] = useState({ total: 0, eligible: 0, drawn: 0 });
  const [isDrawSpinning, setIsDrawSpinning] = useState(false);
  const isUploadTab = activeTab === TAB_IDS.ENTRY_UPLOAD;
  const isRaffleTab = activeTab === TAB_IDS.RAFFLE;
  const workflowStep = !selectedEvent ? 'Select Event' : isUploadTab ? 'Upload Entries' : 'Run Draw';
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
        <button type="button" className={`sidebar-link${isUploadTab ? ' sidebar-link--active' : ''}`} onClick={() => setActiveTab(TAB_IDS.ENTRY_UPLOAD)}>
          <IconDashboard />
          <span>Event Dashboard</span>
        </button>
        <button type="button" className={`sidebar-link${isRaffleTab ? ' sidebar-link--active' : ''}`} onClick={() => setActiveTab(TAB_IDS.RAFFLE)}>
          <IconRaffle />
          <span>Raffle Draw</span>
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
            <h1 className="title">{isUploadTab ? 'Event Dashboard' : 'Raffle Console'}</h1>
            <p className="subtitle">
              {isUploadTab
                ? 'Manage events, upload participants, and monitor raffle readiness.'
                : 'Run secure draws, track winners, and manage raffle outcomes.'}
            </p>
          </div>
          <span className="status-chip">{selectedEvent ? 'Event selected' : 'No event selected'}</span>
        </header>

        <section className="kpi-grid">
          <article className="kpi-card">
            <p className="kpi-label">Current Section</p>
            <p className="kpi-value kpi-value--sm">{isUploadTab ? 'Event Dashboard' : 'Raffle Console'}</p>
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
          <TabNavigator activeTabId={activeTab} onTabChange={setActiveTab} />

          <section hidden={!isUploadTab}>
            <EntryUpload
              selectedEvent={selectedEvent}
              onSelectEvent={setSelectedEvent}
              onDeleteSelectedEvent={() => setSelectedEvent(null)}
              onStatsChange={setUploadStats}
              onUploadStateChange={setUploadState}
            />
          </section>

          <section hidden={!isRaffleTab}>
            <RaffleRandomizer
              selectedEvent={selectedEvent}
              uploadState={uploadState}
              onStatsChange={setRaffleStats}
              onSpinStateChange={setIsDrawSpinning}
            />
          </section>
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

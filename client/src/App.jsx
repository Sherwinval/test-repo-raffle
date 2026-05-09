import { useState } from 'react';
import { TabNavigator } from '@/components/TabNavigator';
import { TAB_IDS } from '@/constants/app.constants';
import { EntryUpload } from '@/features/entry-upload/EntryUpload';
import { RaffleRandomizer } from '@/features/raffle/RaffleRandomizer';

export const App = () => {
  const [activeTab, setActiveTab] = useState(TAB_IDS.ENTRY_UPLOAD);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [uploadStats, setUploadStats] = useState({ entryCount: 0 });
  const [raffleStats, setRaffleStats] = useState({ total: 0, eligible: 0, drawn: 0 });
  const isUploadTab = activeTab === TAB_IDS.ENTRY_UPLOAD;
  const isRaffleTab = activeTab === TAB_IDS.RAFFLE;
  const workflowStep = !selectedEvent ? 'Select Event' : isUploadTab ? 'Upload Entries' : 'Run Draw';

  return (
    <div className="dashboard-shell app-root">
      <aside className="dashboard-sidebar">
        <div className="brand-block">
          <p className="brand-logo" aria-label="Rafflehub">
            <span className="brand-logo-raffle">Raffle</span>
            <span className="brand-logo-hub">Hub</span>
          </p>
        </div>
        <p className="sidebar-label">Navigation</p>
        <button type="button" className={`sidebar-link${isUploadTab ? ' sidebar-link--active' : ''}`} onClick={() => setActiveTab(TAB_IDS.ENTRY_UPLOAD)}>
          <span className="sidebar-link-icon">▦</span>
          Event Dashboard
        </button>
        <button type="button" className={`sidebar-link${isRaffleTab ? ' sidebar-link--active' : ''}`} onClick={() => setActiveTab(TAB_IDS.RAFFLE)}>
          <span className="sidebar-link-icon">🎟</span>
          Raffle Draw
        </button>
        <div className="sidebar-footer">
          <button type="button" className="sidebar-link">
            <span className="sidebar-link-icon">⚙</span>
            Settings
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
            <p className="kpi-value kpi-value--sm">{isUploadTab ? '📊 Event Dashboard' : '🎰 Raffle Console'}</p>
          </article>
          <article className="kpi-card">
            <p className="kpi-label">Active Event</p>
            <p className="kpi-value kpi-value--sm">{selectedEvent?.name || 'No event selected'}</p>
            <p className="tiny-copy kpi-subcopy">Participants: {(uploadStats.entryCount ?? raffleStats.total ?? 0).toLocaleString()}</p>
          </article>
          <article className="kpi-card">
            <p className="kpi-label">Workflow</p>
            <p className="kpi-value kpi-value--sm">🧭 {workflowStep}</p>
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
            />
          </section>

          <section hidden={!isRaffleTab}>
            <RaffleRandomizer selectedEvent={selectedEvent} onStatsChange={setRaffleStats} />
          </section>
        </section>
      </main>
    </div>
  );
};

import { useState } from 'react';
import { TabNavigator } from '@/components/TabNavigator';
import { TAB_IDS } from '@/constants/app.constants';
import { EntryUpload } from '@/features/entry-upload/EntryUpload';
import { RaffleRandomizer } from '@/features/raffle/RaffleRandomizer';

export const App = () => {
  const [activeTab, setActiveTab] = useState(TAB_IDS.ENTRY_UPLOAD);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const isUploadTab = activeTab === TAB_IDS.ENTRY_UPLOAD;
  const isRaffleTab = activeTab === TAB_IDS.RAFFLE;

  return (
    <div className="dashboard-shell app-root">
      <aside className="dashboard-sidebar">
        <div className="brand-block">
          <div className="brand-icon">R</div>
          <div>
            <p className="brand-title">Raffle System</p>
            <p className="brand-subtitle">Internal Tool</p>
          </div>
        </div>
        <p className="sidebar-label">Navigation</p>
        <button type="button" className={`sidebar-link${isUploadTab ? ' sidebar-link--active' : ''}`} onClick={() => setActiveTab(TAB_IDS.ENTRY_UPLOAD)}>
          Event Dashboard
        </button>
        <button type="button" className={`sidebar-link${isRaffleTab ? ' sidebar-link--active' : ''}`} onClick={() => setActiveTab(TAB_IDS.RAFFLE)}>
          Raffle Draw
        </button>
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
            <p className="kpi-label">Tool Section</p>
            <p className="kpi-value">{isUploadTab ? 'Upload' : 'Raffle'}</p>
          </article>
          <article className="kpi-card">
            <p className="kpi-label">Current Event</p>
            <p className="kpi-value kpi-value--sm">{selectedEvent?.name || 'Not selected'}</p>
          </article>
          <article className="kpi-card">
            <p className="kpi-label">Workflow</p>
            <p className="kpi-value">Active</p>
          </article>
        </section>

        <section className="dashboard-panel">
          <TabNavigator activeTabId={activeTab} onTabChange={setActiveTab} />

          <section hidden={!isUploadTab}>
            <EntryUpload
              selectedEvent={selectedEvent}
              onSelectEvent={setSelectedEvent}
              onDeleteSelectedEvent={() => setSelectedEvent(null)}
            />
          </section>

          <section hidden={!isRaffleTab}>
            <RaffleRandomizer selectedEvent={selectedEvent} />
          </section>
        </section>
      </main>
    </div>
  );
};

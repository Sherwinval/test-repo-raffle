import { useState } from 'react';
import { TabNavigator } from '@/components/TabNavigator';
import { EntryUpload } from '@/features/entry-upload/EntryUpload';
import { RaffleRandomizer } from '@/features/raffle/RaffleRandomizer';
import { RaffleAudit } from '@/features/raffle/RaffleAudit';
import EventSelector from '@/components/EventSelector';

const IconDashboard = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>
);
const IconSettings = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" /></svg>
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
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const workflowStep = !selectedEvent ? 'Select Event' : raffleStats.drawn > 0 ? 'Review Winners' : 'Run Draw';
  const uploadLockStatuses = new Set(['uploading', 'parsing', 'pending', 'validating', 'saving', 'processing', 'canceling', 'reconnecting']);
  const isUploadLocked = uploadLockStatuses.has(uploadState.status);
  const interactionLocked = isDrawSpinning || isUploadLocked;
  const lockMessage = isDrawSpinning ? 'Drawing winner. Please wait...' : 'Uploading entries. Please wait...';

  return (
    <div className={`dashboard-shell app-root ${isSidebarCollapsed ? 'collapsed' : ''}`}>
      <aside className="dashboard-sidebar">
        <div className="brand-block">
          {/* Expanded: RAFDOM name */}
          <div className="brand-logo-wrap">
            <p className="brand-logo" aria-label="RAFDOM">
              <span className="brand-logo-raffle">RAF</span>
              <span className="brand-logo-hub">DOM</span>
            </p>
          </div>
          {/* Collapsed: RD icon matching brand style */}
          <p className="brand-logo-icon-text" aria-label="RD">
            <span className="brand-logo-raffle">R</span><span className="brand-logo-hub">D</span>
          </p>
          <button className="sidebar-collapse-btn" onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
            {isSidebarCollapsed ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
            )}
          </button>
        </div>
        <div className="sidebar-accent-line" />
        
        <div className="sidebar-nav" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <p className="sidebar-label">MAIN</p>
          <button type="button" className="sidebar-link" onClick={() => setSelectedEvent(null)}>
          <IconDashboard />
          <span>Overview</span>
        </button>
        <button type="button" className="sidebar-link sidebar-link--active" onClick={() => setSelectedEvent(null)}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
          <span>Events</span>
        </button>
        <button type="button" className="sidebar-link">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" /></svg>
          <span>Participants</span>
        </button>
        <button type="button" className="sidebar-link">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
          <span>Draw History</span>
        </button>

        <p className="sidebar-label" style={{ marginTop: '1.5rem' }}>SETTINGS</p>
        <button type="button" className="sidebar-link">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="21" x2="4" y2="14" /><line x1="4" y1="10" x2="4" y2="3" /><line x1="12" y1="21" x2="12" y2="12" /><line x1="12" y1="8" x2="12" y2="3" /><line x1="20" y1="21" x2="20" y2="16" /><line x1="20" y1="12" x2="20" y2="3" /><line x1="1" y1="14" x2="7" y2="14" /><line x1="9" y1="8" x2="15" y2="8" /><line x1="17" y1="16" x2="23" y2="16" /></svg>
          <span>Rules & Weights</span>
        </button>
        <button type="button" className="sidebar-link">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 01-3.46 0" /></svg>
          <span>Notifications</span>
        </button>
          <button type="button" className="sidebar-link">
            <IconSettings />
            <span>Settings</span>
          </button>
        </div>

        <div className="sidebar-footer" style={{ marginTop: 'auto' }}>
          <div className="sidebar-user">
            <span className="sidebar-user-avatar">RD</span>
            <div>
              <p className="sidebar-user-name">Raffle Operator</p>
              <p className="sidebar-user-role">Admin</p>
            </div>
          </div>
        </div>
      </aside>

      <main className="dashboard-main">
        {!selectedEvent ? (
          <EventSelector
            onSelect={(event) => {
              setSelectedEvent(event);
              setActiveEventTab('raffle');
              setAuditRefreshKey((key) => key + 1);
            }}
          />
        ) : (
          <>
            <header className="dashboard-header">
              <div>
                <p className="tiny-copy" style={{ marginBottom: '0.25rem', opacity: 0.6 }}>Dashboard / Events / {selectedEvent.name}</p>
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
                  showEventSelector={false}
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
          </>
        )}
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

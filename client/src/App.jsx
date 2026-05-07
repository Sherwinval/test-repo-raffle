import { useState } from 'react';
import { TabNavigator } from '@/components/TabNavigator';
import { TAB_IDS } from '@/constants/app.constants';
import { EntryUpload } from '@/features/entry-upload/EntryUpload';
import { RaffleRandomizer } from '@/features/raffle/RaffleRandomizer';

export const App = () => {
  const [activeTab, setActiveTab] = useState(TAB_IDS.ENTRY_UPLOAD);
  const [selectedEvent, setSelectedEvent] = useState(null);

  return (
    <div className="page-shell app-root">
      <div className="app-container">
        <div className="hero-card">
          <div className="badge-row">
            <span className="pill">Raffle Management</span>
            <span className="pill">Upload + Draw</span>
          </div>

          <h1 className="title">Raffle Entry Upload</h1>
          <p className="subtitle">
            Select an event, import entries from CSV or Excel, then run a slot-machine style raffle draw with crypto-locked winners.
          </p>

          <TabNavigator activeTabId={activeTab} onTabChange={setActiveTab} />

          <section hidden={activeTab !== TAB_IDS.ENTRY_UPLOAD}>
            <EntryUpload
              selectedEvent={selectedEvent}
              onSelectEvent={setSelectedEvent}
              onDeleteSelectedEvent={() => setSelectedEvent(null)}
            />
          </section>

          <section hidden={activeTab !== TAB_IDS.RAFFLE}>
            <RaffleRandomizer selectedEvent={selectedEvent} />
          </section>
        </div>
      </div>
    </div>
  );
};

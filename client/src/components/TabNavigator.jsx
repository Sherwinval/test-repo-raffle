import { APP_TABS } from '@/constants/app.constants';

export const TabNavigator = ({ tabs = APP_TABS, activeTabId, onTabChange }) => {
  return (
    <div className="tab-wrap">
      <div className="tab-nav" role="tablist" aria-label="Raffle tool sections">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={activeTabId === tab.id}
          className={`tab-btn${activeTabId === tab.id ? ' tab-btn--active' : ''}`}
          onClick={() => onTabChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
      </div>
    </div>
  );
};

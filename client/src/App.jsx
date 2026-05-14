import { useMemo } from 'react';
import { useHashRoute } from '@/router/useHashRoute';
import { useCurrentRole, useCurrentUser } from '@/auth/useCurrentRole';
import { RequireRole } from '@/auth/RequireRole';
import { EventsListPage } from '@/pages/EventsListPage';
import { EventDashboardPage } from '@/pages/EventDashboardPage';
import { OverviewPage } from '@/pages/OverviewPage';
import { ParticipantsPage } from '@/pages/ParticipantsPage';
import { DrawHistoryPage } from '@/pages/DrawHistoryPage';
import { RulesPage } from '@/pages/RulesPage';
import { NotificationsPage } from '@/pages/NotificationsPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { ForbiddenPage } from '@/pages/Forbidden';
import { NotificationBell } from '@/features/notifications/NotificationBell';

const IconDashboard = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>
);
const IconSettings = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" /></svg>
);

const IconCalendar = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
);
const IconUsers = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" /></svg>
);
const IconHistory = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
);
const IconRules = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="21" x2="4" y2="14" /><line x1="4" y1="10" x2="4" y2="3" /><line x1="12" y1="21" x2="12" y2="12" /><line x1="12" y1="8" x2="12" y2="3" /><line x1="20" y1="21" x2="20" y2="16" /><line x1="20" y1="12" x2="20" y2="3" /><line x1="1" y1="14" x2="7" y2="14" /><line x1="9" y1="8" x2="15" y2="8" /><line x1="17" y1="16" x2="23" y2="16" /></svg>
);
const IconBell = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 01-3.46 0" /></svg>
);

const NAV_ITEMS = [
  { path: '/', label: 'Overview', Icon: IconDashboard, match: ['/', '/overview'] },
  { path: '/events', label: 'Events', Icon: IconCalendar, match: ['/events'] },
  { path: '/participants', label: 'Participants', Icon: IconUsers, match: ['/participants'] },
  { path: '/draws', label: 'Draw History', Icon: IconHistory, match: ['/draws'] }
];

const SETTINGS_ITEMS = [
  { path: '/rules', label: 'Rules & Weights', Icon: IconRules, match: ['/rules'] },
  { path: '/notifications', label: 'Notifications', Icon: IconBell, match: ['/notifications'] },
  { path: '/settings', label: 'Settings', Icon: IconSettings, match: ['/settings'], adminOnly: true }
];

function isActive(matchList, currentPath) {
  return matchList.some((m) => currentPath === m || currentPath.startsWith(`${m}/`));
}

function SidebarLink({ item, currentPath, navigate, collapsed }) {
  const active = isActive(item.match, currentPath);
  return (
    <button
      type="button"
      className={`sidebar-link ${active ? 'sidebar-link--active' : ''}`}
      onClick={() => navigate(item.path)}
      title={collapsed ? item.label : undefined}
    >
      <item.Icon />
      <span>{item.label}</span>
    </button>
  );
}

export const App = () => {
  const { path, segments, navigate } = useHashRoute();
  const role = useCurrentRole();
  const user = useCurrentUser();
  return <AppShell path={path} segments={segments} navigate={navigate} role={role} user={user} />;
};

function AppShell({ path, segments, navigate, role, user }) {
  const route = useMemo(() => resolveRoute(path, segments), [path, segments]);

  return (
    <div className="dashboard-shell app-root">
      <aside className="dashboard-sidebar">
        <div className="brand-block">
          <div className="brand-logo-wrap">
            <p className="brand-logo" aria-label="RAFDOM">
              <span className="brand-logo-raffle">RAF</span>
              <span className="brand-logo-hub">DOM</span>
            </p>
          </div>
          <p className="brand-logo-icon-text" aria-label="RD">
            <span className="brand-logo-raffle">R</span><span className="brand-logo-hub">D</span>
          </p>
        </div>
        <div className="sidebar-accent-line" />

        <div className="sidebar-nav" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <p className="sidebar-label">MAIN</p>
          {NAV_ITEMS.map((item) => (
            <SidebarLink key={item.path} item={item} currentPath={path} navigate={navigate} />
          ))}

          <p className="sidebar-label" style={{ marginTop: '1.5rem' }}>SETTINGS</p>
          {SETTINGS_ITEMS.filter((i) => !i.adminOnly || role === 'ADMIN').map((item) => (
            <SidebarLink key={item.path} item={item} currentPath={path} navigate={navigate} />
          ))}
        </div>

        <div className="sidebar-footer" style={{ marginTop: 'auto' }}>
          <NotificationBell navigate={navigate} />
          <div className="sidebar-user" style={{ marginTop: '0.5rem' }}>
            <span className="sidebar-user-avatar">{(user.name || 'RD').split(' ').map((s) => s[0]).slice(0, 2).join('').toUpperCase()}</span>
            <div>
              <p className="sidebar-user-name">{user.name}</p>
              <p className="sidebar-user-role">{role}</p>
            </div>
          </div>
        </div>
      </aside>

      <main className="dashboard-main">
        {renderRoute(route, navigate, role)}
      </main>
    </div>
  );
}

function resolveRoute(path, segments) {
  if (segments.length === 0 || segments[0] === 'overview') return { name: 'overview' };
  if (segments[0] === 'events') {
    if (segments.length === 1) return { name: 'events-list' };
    return { name: 'event-dashboard', eventId: segments[1] };
  }
  if (segments[0] === 'participants') return { name: 'participants', participantId: segments[1] };
  if (segments[0] === 'draws') return { name: 'draws', drawId: segments[1] };
  if (segments[0] === 'rules') return { name: 'rules', eventId: segments[1] };
  if (segments[0] === 'notifications') return { name: 'notifications' };
  if (segments[0] === 'settings') return { name: 'settings', section: segments[1] };
  return { name: 'not-found' };
}

function renderRoute(route, navigate, role) {
  switch (route.name) {
    case 'overview':
      return <OverviewPage navigate={navigate} />;
    case 'events-list':
      return <EventsListPage navigate={navigate} />;
    case 'event-dashboard':
      return <EventDashboardPage eventId={route.eventId} navigate={navigate} />;
    case 'participants':
      return <ParticipantsPage navigate={navigate} participantId={route.participantId} />;
    case 'draws':
      return <DrawHistoryPage navigate={navigate} drawId={route.drawId} />;
    case 'rules':
      return <RulesPage navigate={navigate} eventId={route.eventId} />;
    case 'notifications':
      return <NotificationsPage navigate={navigate} />;
    case 'settings':
      return (
        <RequireRole role="ADMIN" fallback={<ForbiddenPage />}>
          <SettingsPage navigate={navigate} section={route.section} />
        </RequireRole>
      );
    default:
      return (
        <div className="soft-card" style={{ padding: '2rem' }}>
          <p className="card-heading">Page not found</p>
          <button type="button" className="btn-primary action-btn" onClick={() => navigate('/')}>Go to Overview</button>
        </div>
      );
  }
}

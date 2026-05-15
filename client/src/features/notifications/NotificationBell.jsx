import { useEffect, useState } from 'react';
import { fetchUnreadCount } from './notifications.service';

export function NotificationBell({ navigate }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const refresh = () => {
      fetchUnreadCount()
        .then((d) => !cancelled && setCount(d.count || 0))
        .catch(() => {});
    };
    refresh();
    const interval = setInterval(refresh, 30000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return (
    <button
      type="button"
      className="sidebar-link"
      onClick={() => navigate('/notifications')}
      title="Notifications"
      style={{ position: 'relative' }}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 01-3.46 0" />
      </svg>
      <span>Inbox</span>
      {count > 0 && (
        <span style={{
          position: 'absolute', right: '8px', top: '8px',
          background: '#ef4444', color: '#fff', borderRadius: '999px',
          padding: '0 6px', fontSize: '11px', fontWeight: 700
        }}>{count}</span>
      )}
    </button>
  );
}

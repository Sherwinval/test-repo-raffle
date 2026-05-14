import { useEffect, useState } from 'react';
import { PageShell } from './PageShell';
import {
  fetchNotifications,
  markRead,
  markAllRead,
  fetchPreferences,
  savePreferences
} from '@/features/notifications/notifications.service';

const CATEGORIES = ['UPLOAD', 'DRAW', 'RULE_CHANGE', 'WINNER', 'SYSTEM'];
const CHANNELS = ['IN_APP', 'EMAIL'];

export function NotificationsPage() {
  const [tab, setTab] = useState('inbox');
  const [items, setItems] = useState([]);
  const [prefs, setPrefs] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    fetchNotifications({ limit: 50 })
      .then((d) => setItems(d.items || []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
    fetchPreferences()
      .then(setPrefs)
      .catch(() => {});
  }, []);

  function isEnabled(category, channel) {
    return prefs?.[category]?.[channel] ?? true;
  }

  async function togglePref(category, channel) {
    const next = {
      ...prefs,
      [category]: { ...(prefs[category] || {}), [channel]: !isEnabled(category, channel) }
    };
    setPrefs(next);
    try {
      await savePreferences(next);
    } catch (e) {
      setError(e.message);
    }
  }

  async function onMarkRead(id) {
    try {
      await markRead(id);
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n)));
    } catch (e) {
      setError(e.message);
    }
  }

  async function onMarkAllRead() {
    try {
      await markAllRead();
      const now = new Date().toISOString();
      setItems((prev) => prev.map((n) => ({ ...n, readAt: n.readAt || now })));
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <PageShell breadcrumb="Dashboard / Notifications" title="Notifications" subtitle="System alerts, draw activity, and your delivery preferences.">
      <div className="tab-wrap" style={{ marginBottom: '1rem' }}>
        <button className={`tab-btn ${tab === 'inbox' ? 'tab-btn--active' : ''}`} onClick={() => setTab('inbox')}>Inbox</button>
        <button className={`tab-btn ${tab === 'preferences' ? 'tab-btn--active' : ''}`} onClick={() => setTab('preferences')}>Preferences</button>
      </div>

      {error && <div className="error-card" style={{ marginBottom: '1rem' }}>{error}</div>}

      {tab === 'inbox' && (
        <>
          <button type="button" className="btn-ghost" style={{ marginBottom: '1rem' }} onClick={onMarkAllRead}>Mark all read</button>
          {loading ? (
            <p className="tiny-copy">Loading...</p>
          ) : items.length === 0 ? (
            <p className="tiny-copy">No notifications yet.</p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {items.map((n) => (
                <li key={n.id} className="event-card-row">
                  <div style={{ flex: 1 }}>
                    <strong style={{ opacity: n.readAt ? 0.7 : 1 }}>{n.summary}</strong>
                    <p className="tiny-copy">{n.type} · {new Date(n.createdAt).toLocaleString()}</p>
                  </div>
                  <div>
                    {!n.readAt && (
                      <button type="button" className="btn-ghost-sm" onClick={() => onMarkRead(n.id)}>Mark read</button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {tab === 'preferences' && (
        <div className="soft-card">
          <p className="card-heading">Channel preferences</p>
          <p className="tiny-copy">Choose where each category of notification is delivered.</p>
          <table style={{ width: '100%', marginTop: '1rem', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left' }}>Category</th>
                {CHANNELS.map((ch) => <th key={ch} style={{ textAlign: 'center' }}>{ch}</th>)}
              </tr>
            </thead>
            <tbody>
              {CATEGORIES.map((cat) => (
                <tr key={cat}>
                  <td>{cat}</td>
                  {CHANNELS.map((ch) => (
                    <td key={ch} style={{ textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={isEnabled(cat, ch)}
                        onChange={() => togglePref(cat, ch)}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PageShell>
  );
}

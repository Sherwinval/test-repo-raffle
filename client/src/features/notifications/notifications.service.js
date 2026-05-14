export async function fetchNotifications({ limit = 50, unreadOnly = false } = {}) {
  const params = new URLSearchParams();
  params.set('limit', String(limit));
  if (unreadOnly) params.set('unreadOnly', 'true');
  const res = await fetch(`/api/notifications?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to load notifications.');
  return res.json();
}

export async function fetchUnreadCount() {
  const res = await fetch('/api/notifications/unread-count');
  if (!res.ok) return { count: 0 };
  return res.json();
}

export async function markRead(id) {
  const res = await fetch(`/api/notifications/${id}/read`, { method: 'PATCH' });
  if (!res.ok) throw new Error('Failed to mark read.');
  return res.json();
}

export async function markAllRead() {
  const res = await fetch('/api/notifications/mark-all-read', { method: 'POST' });
  if (!res.ok) throw new Error('Failed to mark all read.');
  return res.json();
}

export async function fetchPreferences() {
  const res = await fetch('/api/notifications/preferences');
  if (!res.ok) throw new Error('Failed to load preferences.');
  return res.json();
}

export async function savePreferences(prefs) {
  const res = await fetch('/api/notifications/preferences', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(prefs)
  });
  if (!res.ok) throw new Error('Failed to save preferences.');
  return res.json();
}

export async function fetchDraws({ eventId, status, limit = 100 } = {}) {
  const params = new URLSearchParams();
  if (eventId) params.set('eventId', eventId);
  if (status) params.set('status', status);
  if (limit) params.set('limit', String(limit));
  const res = await fetch(`/api/draws?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to load draws.');
  return res.json();
}

export async function fetchDraw(id) {
  const res = await fetch(`/api/draws/${id}`);
  if (!res.ok) throw new Error('Failed to load draw.');
  return res.json();
}

export async function voidDraw(id, reason) {
  const res = await fetch(`/api/draws/${id}/void`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to void draw.');
  }
  return res.json();
}

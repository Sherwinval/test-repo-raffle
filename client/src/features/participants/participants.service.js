export async function fetchParticipants({ search = '', status, eventId, cursor, limit = 50 } = {}) {
  const params = new URLSearchParams();
  if (search) params.set('search', search);
  if (status) params.set('status', status);
  if (eventId) params.set('eventId', eventId);
  if (cursor) params.set('cursor', cursor);
  if (limit) params.set('limit', String(limit));
  const res = await fetch(`/api/participants?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to load participants.');
  return res.json();
}

export async function fetchParticipantDetail(id) {
  const res = await fetch(`/api/participants/${id}`);
  if (!res.ok) throw new Error('Failed to load participant.');
  return res.json();
}

export async function updateParticipant(id, body) {
  const res = await fetch(`/api/participants/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to update participant.');
  }
  return res.json();
}

export async function fetchParticipantFacets() {
  const res = await fetch('/api/participants/facets');
  if (!res.ok) throw new Error('Failed to load facets.');
  return res.json();
}

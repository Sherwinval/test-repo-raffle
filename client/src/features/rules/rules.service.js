export async function fetchRules(eventId) {
  const res = await fetch(`/api/events/${eventId}/rules`);
  if (!res.ok) throw new Error('Failed to load rules.');
  return res.json();
}

export async function saveRules(eventId, rules) {
  const res = await fetch(`/api/events/${eventId}/rules`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(rules)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to save rules.');
  }
  return res.json();
}

export async function previewRules(eventId) {
  const res = await fetch(`/api/events/${eventId}/rules/preview`);
  if (!res.ok) throw new Error('Failed to load preview.');
  return res.json();
}

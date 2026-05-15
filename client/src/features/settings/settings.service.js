export async function fetchSystemSettings() {
  const res = await fetch('/api/settings/system');
  if (!res.ok) throw new Error('Failed to load settings.');
  return res.json();
}

export async function saveSystemSettings(data) {
  const res = await fetch('/api/settings/system', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to save settings.');
  }
  return res.json();
}

export async function testEmailSimulation() {
  const res = await fetch('/api/settings/email/test', { method: 'POST' });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Email simulation failed.');
  }
  return res.json();
}

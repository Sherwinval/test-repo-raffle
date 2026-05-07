export const fetchEvents = async () => {
  const res = await fetch('/api/events');
  if (!res.ok) throw new Error('Failed to load events.');
  return res.json();
};

export const createEvent = async (name) => {
  const res = await fetch('/api/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name })
  });
  if (!res.ok) {
    const body = await res.json();
    throw new Error(body?.error || 'Failed to create event.');
  }
  return res.json();
};

export const deleteEvent = async (eventId) => {
  const res = await fetch(`/api/events/${eventId}`, { method: 'DELETE' });
  if (!res.ok) {
    const body = await res.json();
    throw new Error(body?.error || 'Failed to delete event.');
  }
  return res.json();
};

export const validateEntryUpload = async ({ eventId, file }) => {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`/api/events/${eventId}/entries/upload`, {
    method: 'POST',
    body: formData
  });

  if (res.status === 409) {
    return { status: 'duplicate-confirmation', payload: await res.json() };
  }

  if (!res.ok) {
    const body = await res.json();
    throw new Error(body?.error || 'Validation failed.');
  }

  return { status: 'ready', payload: await res.json() };
};

export const uploadEntries = async ({ eventId, file, duplicateMode, signal }) => {
  const formData = new FormData();
  formData.append('file', file);
  if (duplicateMode) formData.append('duplicateMode', duplicateMode);

  const res = await fetch(`/api/events/${eventId}/entries/upload`, {
    method: 'POST',
    body: formData,
    signal
  });

  if (res.status === 409) {
    return { status: 'duplicate-confirmation', payload: await res.json() };
  }

  if (!res.ok) {
    const body = await res.json();
    throw new Error(body?.error || 'Upload failed.');
  }

  return { status: 'accepted', payload: await res.json() };
};

export const cancelUpload = async (uploadId) => {
  const res = await fetch(`/api/upload/cancel/${uploadId}`, { method: 'POST' });
  const body = await res.json();
  if (!res.ok) {
    throw new Error(body?.error || 'Failed to cancel upload.');
  }
  return body;
};

export const fetchUploadProgress = async (uploadId) => {
  const res = await fetch(`/api/upload/progress/${uploadId}`);
  if (!res.ok) {
    const body = await res.json();
    throw new Error(body?.error || 'Progress request failed.');
  }
  return res.json();
};

export const fetchEntryStats = async (eventId) => {
  const res = await fetch(`/api/events/${eventId}/entries/stats`);
  if (!res.ok) throw new Error('Failed to fetch entry count.');
  return res.json();
};

export const fetchEntriesPage = async ({ eventId, page, pageSize, search = '', department = '' }) => {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (search) params.set('search', search);
  if (department) params.set('department', department);

  const res = await fetch(`/api/events/${eventId}/entries?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch entries.');
  return res.json();
};

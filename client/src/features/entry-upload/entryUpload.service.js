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
  formData.append('operator', 'Raffle Operator');

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

export const resolveUploadIssues = async ({ uploadId, rows }) => {
  const res = await fetch(`/api/upload/resolve/${uploadId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rows })
  });
  const body = await res.json();
  if (!res.ok) {
    throw new Error(body?.error || 'Failed to resolve upload issues.');
  }
  return body;
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

export const createEntry = async ({ eventId, employeeId, fullName, department, email, entryCode }) => {
  const res = await fetch(`/api/events/${eventId}/entries`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ employeeId, fullName, department, email, entryCode, operator: 'Raffle Operator' })
  });

  if (res.status === 409) {
    const body = await res.json();
    throw new Error(body.error);
  }

  if (!res.ok) {
    const body = await res.json();
    throw new Error(body?.error || 'Failed to create entry.');
  }

  return res.json();
};

export const fetchEventAudit = async (eventId) => {
  const res = await fetch(`/api/events/${eventId}/audit`);
  if (!res.ok) throw new Error('Failed to fetch event audit log.');
  return res.json();
};

export const appendEventAudit = async ({ eventId, action, operator = 'Raffle Operator', details = {} }) => {
  const res = await fetch(`/api/events/${eventId}/audit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, operator, details })
  });
  if (!res.ok) {
    const body = await res.json();
    throw new Error(body?.error || 'Failed to write audit log.');
  }
  return res.json();
};

export const fetchAllEntriesForEvent = async (eventId) => {
  const pageSize = 100;
  let page = 1;
  let totalPages = 1;
  const all = [];

  while (page <= totalPages) {
    const res = await fetch(`/api/events/${eventId}/entries?page=${page}&pageSize=${pageSize}`);
    if (!res.ok) throw new Error('Failed to load existing entries for duplicate checking.');
    const data = await res.json();
    all.push(...(data.entries || []));
    totalPages = data.totalPages || 1;
    page += 1;
  }

  return all;
};

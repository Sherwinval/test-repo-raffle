const PAGE_SIZE = 10000;
const WINNER_STORAGE_KEY = 'raffle:winners';

export const fetchAllEventEntries = async (eventId) => {
  let page = 1;
  let totalPages = 1;
  const all = [];

  while (page <= totalPages) {
    const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
    const res = await fetch(`/api/events/${eventId}/entries?${params.toString()}`);
    if (!res.ok) throw new Error('Failed to load raffle entries.');
    const data = await res.json();
    all.push(...(data.entries || []));
    totalPages = data.totalPages || 1;
    page += 1;
  }

  return all;
};

export const getStoredWinnersByEvent = () => {
  try {
    return JSON.parse(localStorage.getItem(WINNER_STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
};

export const saveStoredWinnersByEvent = (byEvent) => {
  localStorage.setItem(WINNER_STORAGE_KEY, JSON.stringify(byEvent));
};

export const getWinnersForEvent = (eventId) => {
  const byEvent = getStoredWinnersByEvent();
  return byEvent[eventId] || [];
};

export const addWinnerForEvent = (eventId, winnerRecord) => {
  const byEvent = getStoredWinnersByEvent();
  const current = byEvent[eventId] || [];
  byEvent[eventId] = [winnerRecord, ...current];
  saveStoredWinnersByEvent(byEvent);
  return byEvent[eventId];
};

export const clearWinnersForEvent = (eventId) => {
  const byEvent = getStoredWinnersByEvent();
  byEvent[eventId] = [];
  saveStoredWinnersByEvent(byEvent);
  return [];
};

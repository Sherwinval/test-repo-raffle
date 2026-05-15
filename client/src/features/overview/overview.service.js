export async function fetchOverview() {
  const res = await fetch('/api/overview');
  if (!res.ok) throw new Error('Failed to load overview.');
  return res.json();
}

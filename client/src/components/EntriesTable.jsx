import { useEffect, useRef, useState } from 'react';

const PAGE_SIZE = 50;

export default function EntriesTable({ eventId, refreshKey }) {
  const [entries, setEntries] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('');
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef(null);

  // Reset to page 1 whenever filters change
  useEffect(() => {
    setPage(1);
  }, [search, department, eventId]);

  useEffect(() => {
    fetchEntries();
  }, [page, search, department, eventId, refreshKey]); // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchEntries() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, pageSize: PAGE_SIZE });
      if (search) params.set('search', search);
      if (department) params.set('department', department);

      const res = await fetch(`/api/events/${eventId}/entries?${params}`);
      if (!res.ok) return;
      const data = await res.json();
      setEntries(data.entries ?? []);
      setTotal(data.total ?? 0);
      setTotalPages(data.totalPages ?? 0);
      if (data.departments?.length) setDepartments(data.departments);
    } finally {
      setLoading(false);
    }
  }

  function handleSearchChange(e) {
    const val = e.target.value;
    setSearchInput(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setSearch(val.trim()), 320);
  }

  function handleClearSearch() {
    setSearchInput('');
    setSearch('');
  }

  const start = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const end = Math.min(page * PAGE_SIZE, total);
  const hasActiveFilter = search || department;

  return (
    <div className="entries-section">
      <div className="entries-header">
        <p className="card-heading">Entries</p>
        <span className="entries-total-badge">{total.toLocaleString()}</span>
      </div>

      <div className="entries-controls">
        <div className="search-wrap">
          <span className="search-icon" aria-hidden="true">⌕</span>
          <input
            type="search"
            className="entries-search"
            placeholder="Search name, ID, email, or entry code…"
            value={searchInput}
            onChange={handleSearchChange}
          />
          {searchInput && (
            <button type="button" className="search-clear" onClick={handleClearSearch} aria-label="Clear search">
              ✕
            </button>
          )}
        </div>

        <select
          className="entries-filter"
          value={department}
          onChange={(e) => setDepartment(e.target.value)}
          aria-label="Filter by department"
        >
          <option value="">All departments</option>
          {departments.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
      </div>

      {loading && entries.length === 0 ? (
        <div className="entries-state">
          <span className="entries-state-icon">⋯</span>
          <p>Loading entries…</p>
        </div>
      ) : entries.length === 0 ? (
        <div className="entries-state">
          <span className="entries-state-icon">○</span>
          <p>{hasActiveFilter ? 'No entries match your search.' : 'No entries uploaded yet.'}</p>
          {hasActiveFilter && (
            <button type="button" className="btn-ghost-sm" onClick={() => { setSearchInput(''); setSearch(''); setDepartment(''); }}>
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="table-wrap">
            <table className="entries-table">
              <thead>
                <tr>
                  <th className="col-num">#</th>
                  <th>Employee ID</th>
                  <th>Full Name</th>
                  <th>Department</th>
                  <th>Email</th>
                  <th>Entry Code</th>
                  <th>Uploaded</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry, i) => (
                  <tr key={entry.id} className={loading ? 'row-fading' : ''}>
                    <td className="col-num">{(page - 1) * PAGE_SIZE + i + 1}</td>
                    <td>{entry.employeeId}</td>
                    <td className="col-name">{entry.fullName}</td>
                    <td><span className="dept-badge">{entry.department}</span></td>
                    <td className="col-email">{entry.email}</td>
                    <td><code className="entry-code">{entry.entryCode}</code></td>
                    <td className="col-date">
                      {new Date(entry.createdAt).toLocaleDateString('en-US', {
                        month: 'short', day: 'numeric', year: '2-digit'
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="pagination">
            <button
              type="button"
              className="btn-ghost pagination-btn"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1 || loading}
            >
              ← Prev
            </button>
            <span className="pagination-info">
              {start.toLocaleString()}–{end.toLocaleString()} of {total.toLocaleString()}
            </span>
            <button
              type="button"
              className="btn-ghost pagination-btn"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages || loading}
            >
              Next →
            </button>
          </div>
        </>
      )}
    </div>
  );
}

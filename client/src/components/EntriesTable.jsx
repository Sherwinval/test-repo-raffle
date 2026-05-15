import { useEffect, useRef, useState } from 'react';

const PAGE_SIZE = 50;

const IconSearch = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);

const IconInbox = () => (
  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#555' }}>
    <polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z"/>
  </svg>
);

const IconLoader = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="spin-icon" style={{ color: '#ef4444' }}>
    <line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/>
  </svg>
);

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
          <span className="search-icon"><IconSearch /></span>
          <input
            type="search"
            className="entries-search"
            placeholder="Search name, ID, email, or entry code..."
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
          <IconLoader />
          <p>Loading entries...</p>
        </div>
      ) : entries.length === 0 ? (
        <div className="entries-state">
          <IconInbox />
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
              {start.toLocaleString()}-{end.toLocaleString()} of {total.toLocaleString()}
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


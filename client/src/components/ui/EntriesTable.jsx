import { useEffect, useState } from 'react';
import { fetchEntriesPage } from '@/features/entry-upload/entryUpload.service';

const PAGE_SIZE = 20;

export const EntriesTable = ({ eventId, refreshKey }) => {
  const [rows, setRows] = useState([]);

  useEffect(() => {
    if (!eventId) return;
    fetchEntriesPage({ eventId, page: 1, pageSize: PAGE_SIZE })
      .then((data) => setRows(data.entries || []))
      .catch(() => setRows([]));
  }, [eventId, refreshKey]);

  return (
    <section>
      <h3>Latest Entries</h3>
      <table className="simple-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Employee ID</th>
            <th>Email</th>
            <th>Entry Code</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>{row.fullName}</td>
              <td>{row.employeeId}</td>
              <td>{row.email}</td>
              <td>{row.entryCode}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
};

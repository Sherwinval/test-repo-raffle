export function findDuplicateValues(values) {
  const seen = new Set();
  const duplicates = new Set();

  for (const value of values) {
    if (!value) continue;
    if (seen.has(value)) {
      duplicates.add(value);
    } else {
      seen.add(value);
    }
  }

  return Array.from(duplicates);
}

export function findIncompleteRows(rows) {
  const requiredFields = ['email', 'employeeId', 'firstName', 'lastName', 'role', 'site'];
  const missingByRow = [];

  for (const row of rows) {
    const missingFields = requiredFields.filter((field) => {
      const value = row[field];
      return typeof value !== 'string' || value.trim() === '';
    });

    if (missingFields.length > 0) {
      missingByRow.push({
        rowNumber: row.rowNumber,
        missingFields
      });
    }
  }

  return missingByRow;
}

export function findEntryIncompleteRows(rows) {
  const required = ['employeeId', 'fullName', 'department', 'email', 'entryCode'];
  return rows
    .map((row) => {
      const missingFields = required.filter((f) => {
        const v = row[f];
        return typeof v !== 'string' || v.trim() === '';
      });
      return missingFields.length > 0 ? { rowNumber: row.rowNumber, missingFields } : null;
    })
    .filter(Boolean);
}

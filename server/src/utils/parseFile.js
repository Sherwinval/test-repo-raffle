import { parse } from 'csv-parse/sync';
import XLSX from 'xlsx';

function getField(row, names) {
  const normalizedRow = {};
  for (const [key, value] of Object.entries(row)) {
    normalizedRow[normalizeHeader(key)] = value;
  }

  for (const name of names) {
    const candidate = normalizedRow[normalizeHeader(name)];
    if (candidate !== undefined && candidate !== null && String(candidate).trim() !== '') {
      return String(candidate).trim();
    }
  }
  return undefined;
}

function normalizeHeader(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\s_\-]+/g, '');
}

export function parseFileBuffer(buffer, ext) {
  const rows = ext === 'csv'
    ? parseCsv(buffer)
    : parseExcel(buffer);

  return rows
    .map((row, index) => {
      const email = getField(row, [
        'email',
        'Email',
        'EMAIL',
        'e-mail',
        'E-mail',
        'Email Address',
        'email address'
      ])?.toLowerCase();

      return {
        email,
        employeeId: getField(row, [
          'employee id',
          'employee_id',
          'employeeId',
          'employeeid',
          'Employee ID',
          'EmployeeId',
          'id',
          'ID'
        ]),
        role: getField(row, [
          'role',
          'Role'
        ]),
        site: getField(row, [
          'site',
          'Site'
        ]),
        firstName: getField(row, [
          'firstname',
          'firstName',
          'FirstName',
          'first_name',
          'First Name',
          'name',
          'Name'
        ]),
        lastName: getField(row, [
          'lastname',
          'lastName',
          'LastName',
          'last_name',
          'Last Name'
        ]),
        rawData: row,
        rowNumber: index + 2
      };
    });
}

function parseCsv(buffer) {
  const text = buffer.toString('utf8');
  return parse(text, {
    columns: true,
    skip_empty_lines: true,
    trim: true
  });
}

function parseExcel(buffer) {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return [];
  const sheet = workbook.Sheets[sheetName];
  return XLSX.utils.sheet_to_json(sheet, { defval: null });
}

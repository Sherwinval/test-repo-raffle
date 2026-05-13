import { parse } from 'csv-parse/sync';
import XLSX from 'xlsx';

const FIELD_ALIASES = {
  email: ['email', 'Email', 'EMAIL', 'e-mail', 'E-mail', 'Email Address', 'email address'],
  employeeId: ['employee id', 'employee_id', 'employeeId', 'employeeid', 'Employee ID', 'EmployeeId', 'id', 'ID'],
  fullName: ['full_name', 'fullname', 'fullName', 'FullName', 'Full Name', 'full name', 'name', 'Name'],
  department: ['department', 'Department', 'DEPARTMENT', 'dept', 'Dept'],
  entryCode: ['entry_code', 'entrycode', 'entryCode', 'EntryCode', 'Entry Code', 'entry code', 'code', 'Code'],
  role: ['role', 'Role'],
  site: ['site', 'Site'],
  firstName: ['firstname', 'firstName', 'FirstName', 'first_name', 'First Name'],
  lastName: ['lastname', 'lastName', 'LastName', 'last_name', 'Last Name']
};

const NORMALIZED_FIELD_ALIASES = Object.fromEntries(
  Object.entries(FIELD_ALIASES).map(([field, aliases]) => [
    field,
    aliases.map(normalizeHeader)
  ])
);

function getField(normalizedRow, names) {
  for (const name of names) {
    const candidate = normalizedRow[name];
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
  if (ext === 'csv') return parseCsvEntries(buffer);

  const rows = ext === 'csv'
    ? parseCsv(buffer)
    : parseExcel(buffer);

  return rows
    .map((row, index) => {
      const normalizedRow = {};
      for (const [key, value] of Object.entries(row)) {
        normalizedRow[normalizeHeader(key)] = value;
      }

      const email = getField(normalizedRow, NORMALIZED_FIELD_ALIASES.email)?.toLowerCase();

      return {
        email,
        employeeId: getField(normalizedRow, NORMALIZED_FIELD_ALIASES.employeeId),
        fullName: getField(normalizedRow, NORMALIZED_FIELD_ALIASES.fullName),
        department: getField(normalizedRow, NORMALIZED_FIELD_ALIASES.department),
        entryCode: getField(normalizedRow, NORMALIZED_FIELD_ALIASES.entryCode),
        role: getField(normalizedRow, NORMALIZED_FIELD_ALIASES.role),
        site: getField(normalizedRow, NORMALIZED_FIELD_ALIASES.site),
        firstName: getField(normalizedRow, NORMALIZED_FIELD_ALIASES.firstName),
        lastName: getField(normalizedRow, NORMALIZED_FIELD_ALIASES.lastName),
        rawData: row,
        rowNumber: index + 2
      };
    });
}

function buildHeaderIndex(headers) {
  const normalizedHeaders = headers.map(normalizeHeader);

  return Object.fromEntries(
    Object.entries(NORMALIZED_FIELD_ALIASES).map(([field, aliases]) => [
      field,
      aliases.map((alias) => normalizedHeaders.indexOf(alias)).find((index) => index >= 0) ?? -1
    ])
  );
}

function getCell(row, index) {
  if (index < 0) return undefined;
  const value = row[index];
  if (value === undefined || value === null || String(value).trim() === '') return undefined;
  return String(value).trim();
}

function parseCsvEntries(buffer) {
  const text = buffer.toString('utf8');
  const table = parse(text, {
    columns: false,
    skip_empty_lines: true,
    trim: true
  });

  const [headers, ...records] = table;
  if (!headers) return [];

  const headerIndex = buildHeaderIndex(headers);

  return records.map((row, index) => {
    const email = getCell(row, headerIndex.email)?.toLowerCase();

    return {
      email,
      employeeId: getCell(row, headerIndex.employeeId),
      fullName: getCell(row, headerIndex.fullName),
      department: getCell(row, headerIndex.department),
      entryCode: getCell(row, headerIndex.entryCode),
      role: getCell(row, headerIndex.role),
      site: getCell(row, headerIndex.site),
      firstName: getCell(row, headerIndex.firstName),
      lastName: getCell(row, headerIndex.lastName),
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

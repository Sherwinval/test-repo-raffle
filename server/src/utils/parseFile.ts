import { parse } from 'csv-parse/sync';
import XLSX from 'xlsx';

type ParsedRow = Record<string, string | number | boolean | null>;

function getField(row: ParsedRow, names: string[]) {
  for (const name of names) {
    const candidate = row[name];
    if (candidate !== undefined && candidate !== null && String(candidate).trim() !== '') {
      return String(candidate).trim();
    }
  }
  return undefined;
}

export function parseFileBuffer(buffer: Buffer, ext: string) {
  const rows: ParsedRow[] = ext === 'csv'
    ? parseCsv(buffer)
    : parseExcel(buffer);

  return rows
    .map((row) => {
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
          'First Name'
        ]),
        lastName: getField(row, [
          'lastname',
          'lastName',
          'LastName',
          'last_name',
          'Last Name'
        ]),
        rawData: row
      };
    })
    .filter((row) => typeof row.email === 'string' && row.email.length > 0);
}

function parseCsv(buffer: Buffer) {
  const text = buffer.toString('utf8');
  return parse(text, {
    columns: true,
    skip_empty_lines: true,
    trim: true
  }) as ParsedRow[];
}

function parseExcel(buffer: Buffer) {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return [];
  const sheet = workbook.Sheets[sheetName];
  return XLSX.utils.sheet_to_json<ParsedRow>(sheet, { defval: null });
}

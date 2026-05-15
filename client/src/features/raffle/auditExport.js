const csvEscape = (value) => {
  const text = value == null ? '' : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

const downloadBlob = (blob, fileName) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

export function exportAuditCsv({ event, entryCount, logs }) {
  const rows = [
    ['Event Name', event?.name || ''],
    ['Event ID', event?.id || ''],
    ['Entry Count', entryCount ?? 0],
    ['Exported At', new Date().toISOString()],
    [],
    ['Timestamp', 'Action', 'Operator', 'Details']
  ];

  for (const log of logs) {
    rows.push([
      log.createdAt,
      log.action,
      log.operator,
      JSON.stringify(log.details || {})
    ]);
  }

  const csv = `\uFEFF${rows.map((row) => row.map(csvEscape).join(',')).join('\r\n')}`;
  downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8' }), `${event?.name || 'event'}-audit.csv`);
}

const pdfEscape = (value) => String(value ?? '')
  .replace(/\\/g, '\\\\')
  .replace(/\(/g, '\\(')
  .replace(/\)/g, '\\)')
  .replace(/[^\x20-\x7E]/g, '?');

function buildPdfTextLines({ event, entryCount, logs }) {
  const lines = [
    'RAFDOM Audit Report',
    `Event: ${event?.name || 'Unknown event'}`,
    `Event ID: ${event?.id || ''}`,
    `Created: ${event?.createdAt ? new Date(event.createdAt).toLocaleString() : ''}`,
    `Entry Count: ${entryCount ?? 0}`,
    `Exported: ${new Date().toLocaleString()}`,
    '',
    'Timestamp | Action | Operator | Details'
  ];

  for (const log of logs) {
    const details = JSON.stringify(log.details || {});
    lines.push(`${new Date(log.createdAt).toLocaleString()} | ${log.action} | ${log.operator} | ${details}`);
  }

  return lines.flatMap((line) => {
    const chunks = [];
    for (let i = 0; i < line.length; i += 96) chunks.push(line.slice(i, i + 96));
    return chunks.length ? chunks : [''];
  });
}

export function exportAuditPdf(summary) {
  const lines = buildPdfTextLines(summary);
  const pageLines = 42;
  const pages = [];
  for (let i = 0; i < lines.length; i += pageLines) pages.push(lines.slice(i, i + pageLines));

  const objects = [];
  const addObject = (body) => {
    objects.push(body);
    return objects.length;
  };

  const fontObj = addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  const pageRefs = [];

  for (const page of pages) {
    const commands = ['BT', '/F1 10 Tf', '50 770 Td', '14 TL'];
    page.forEach((line, index) => {
      commands.push(index === 0 ? `(${pdfEscape(line)}) Tj` : `T* (${pdfEscape(line)}) Tj`);
    });
    commands.push('ET');
    const content = commands.join('\n');
    const contentObj = addObject(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
    const pageObj = addObject(`<< /Type /Page /Parent 0 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 ${fontObj} 0 R >> >> /Contents ${contentObj} 0 R >>`);
    pageRefs.push(pageObj);
  }

  const pagesObj = addObject(`<< /Type /Pages /Kids [${pageRefs.map((ref) => `${ref} 0 R`).join(' ')}] /Count ${pageRefs.length} >>`);
  const catalogObj = addObject(`<< /Type /Catalog /Pages ${pagesObj} 0 R >>`);
  const fixedObjects = objects.map((body) => body.replace('/Parent 0 0 R', `/Parent ${pagesObj} 0 R`));

  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  fixedObjects.forEach((body, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${fixedObjects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${fixedObjects.length + 1} /Root ${catalogObj} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  downloadBlob(new Blob([pdf], { type: 'application/pdf' }), `${summary.event?.name || 'event'}-audit.pdf`);
}

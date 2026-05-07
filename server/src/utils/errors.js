export function formatUploadError(error) {
  if (!(error instanceof Error)) return String(error);

  const code = error.code ? ` code=${error.code}` : '';
  const meta = error.meta ? ` meta=${JSON.stringify(error.meta)}` : '';
  const message = error.message ? error.message.replace(/\s+/g, ' ').trim() : 'Unknown error';

  return `${message}${code}${meta}`;
}

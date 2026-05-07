/**
 * @param {string} value
 * @returns {boolean}
 */
export const isNonEmptyString = (value) => typeof value === 'string' && value.trim().length > 0;

/**
 * @param {File | null} file
 * @param {string[]} acceptedExtensions
 * @returns {string | null}
 */
export const validateUploadFile = (file, acceptedExtensions) => {
  if (!file) return 'Please select a file.';
  const ext = String(file.name || '').split('.').pop().toLowerCase();
  if (!acceptedExtensions.includes(ext)) {
    return 'Unsupported file format. Use CSV, XLS, or XLSX.';
  }
  return null;
};

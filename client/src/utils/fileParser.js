/**
 * @param {string} fileName
 * @returns {string}
 */
export const getFileExtension = (fileName) => String(fileName || '').split('.').pop().toLowerCase();

/**
 * @param {File | null} file
 * @returns {{name: string, sizeKb: string} | null}
 */
export const buildFilePreview = (file) => {
  if (!file) return null;
  return {
    name: file.name,
    sizeKb: (file.size / 1024).toFixed(1)
  };
};

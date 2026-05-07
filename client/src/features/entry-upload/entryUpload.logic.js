import { ACCEPTED_FILE_EXTENSIONS } from '@/constants/app.constants';
import { buildFilePreview } from '@/utils/fileParser';
import { validateUploadFile } from '@/utils/validators';

export const getProgressPercent = (progress) => {
  if (!progress?.total) return 0;
  return Math.min(100, Math.round((progress.processed / progress.total) * 100));
};

export const validateEntryUploadSelection = (file) => {
  return validateUploadFile(file, ACCEPTED_FILE_EXTENSIONS);
};

export const createUploadPreviewModel = (file, validationPayload) => ({
  file: buildFilePreview(file),
  totalRows: validationPayload?.totalRows,
  duplicateCount: validationPayload?.duplicateCount || 0,
  fileDuplicateCount: validationPayload?.fileDuplicateCount || 0,
  existingDuplicateCount: validationPayload?.existingDuplicateCount || 0
});

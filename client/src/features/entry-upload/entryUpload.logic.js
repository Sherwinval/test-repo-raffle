import { ACCEPTED_FILE_EXTENSIONS } from '@/constants/app.constants';
import { buildFilePreview } from '@/utils/fileParser';
import { validateUploadFile } from '@/utils/validators';

export const getProgressPercent = (progress) => {
  if (progress?.status === 'done') return 100;
  if (progress?.status === 'reconnecting') {
    return getProgressPercent({ ...progress, status: progress.priorStatus });
  }
  if (progress?.status === 'saving' && progress?.total) {
    return Math.min(98, Math.round(60 + (progress.processed / progress.total) * 38));
  }
  if (progress?.status === 'validating' || progress?.status === 'duplicate-confirmation' || progress?.status === 'needs-review') return 55;
  if (progress?.status === 'parsing' || progress?.status === 'pending') return 35;
  if (progress?.status === 'uploading') return 15;
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

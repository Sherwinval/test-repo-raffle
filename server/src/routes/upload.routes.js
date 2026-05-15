import { Router } from 'express';
import { upload } from '../config/multer.js';
import { requireRole } from '../middleware/requireRole.js';
import {
  uploadParticipants,
  validateUpload,
  getUploadProgress,
  cancelUpload
} from '../controllers/upload.controller.js';
import { resolveUploadIssues } from '../controllers/entries.controller.js';

const router = Router();

router.post('/', requireRole(['ADMIN', 'EVENT_MANAGER']), upload.single('file'), uploadParticipants);
router.post('/validate', requireRole(['ADMIN', 'EVENT_MANAGER']), upload.single('file'), validateUpload);
router.post('/resolve/:uploadId', requireRole(['ADMIN', 'EVENT_MANAGER']), resolveUploadIssues);
router.get('/progress/:uploadId', getUploadProgress);
router.post('/cancel/:uploadId', requireRole(['ADMIN', 'EVENT_MANAGER']), cancelUpload);

export default router;

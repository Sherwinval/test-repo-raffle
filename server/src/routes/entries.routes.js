import { Router } from 'express';
import { upload } from '../config/multer.js';
import { requireRole } from '../middleware/requireRole.js';
import {
  uploadEntries,
  createEntry,
  bulkCreateEntries,
  getBulkEntryProgress,
  cancelBulkEntry,
  resolveBulkEntryDuplicates,
  getEntryStats,
  listEntries
} from '../controllers/entries.controller.js';

const router = Router({ mergeParams: true });

router.post('/', requireRole(['ADMIN', 'EVENT_MANAGER']), createEntry);
router.post('/bulk', requireRole(['ADMIN', 'EVENT_MANAGER']), bulkCreateEntries);
router.get('/bulk/progress/:uploadId', getBulkEntryProgress);
router.post('/bulk/cancel/:uploadId', requireRole(['ADMIN', 'EVENT_MANAGER']), cancelBulkEntry);
router.post('/bulk/resolve/:uploadId', requireRole(['ADMIN', 'EVENT_MANAGER']), resolveBulkEntryDuplicates);
router.post('/upload', requireRole(['ADMIN', 'EVENT_MANAGER']), upload.single('file'), uploadEntries);
router.get('/stats', getEntryStats);
router.get('/', listEntries);

export default router;

import { Router } from 'express';
import { upload } from '../config/multer.js';
import { requireRole } from '../middleware/requireRole.js';
import {
  uploadEntries,
  createEntry,
  getEntryStats,
  listEntries
} from '../controllers/entries.controller.js';

const router = Router({ mergeParams: true });

router.post('/', requireRole(['ADMIN', 'EVENT_MANAGER']), createEntry);
router.post('/upload', requireRole(['ADMIN', 'EVENT_MANAGER']), upload.single('file'), uploadEntries);
router.get('/stats', getEntryStats);
router.get('/', listEntries);

export default router;

import { Router } from 'express';
import { upload } from '../config/multer.js';
import {
  uploadEntries,
  getEntryStats,
  listEntries
} from '../controllers/entries.controller.js';

const router = Router({ mergeParams: true });

router.post('/upload', upload.single('file'), uploadEntries);
router.get('/stats', getEntryStats);
router.get('/', listEntries);

export default router;

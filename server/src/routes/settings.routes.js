import { Router } from 'express';
import { requireRole } from '../middleware/requireRole.js';
import {
  getSystemSettingsHandler,
  putSystemSettingsHandler,
  smtpTestHandler
} from '../controllers/settings.controller.js';

const router = Router();

router.get('/system', requireRole(['ADMIN']), getSystemSettingsHandler);
router.put('/system', requireRole(['ADMIN']), putSystemSettingsHandler);
router.post('/smtp/test', requireRole(['ADMIN']), smtpTestHandler);

export default router;

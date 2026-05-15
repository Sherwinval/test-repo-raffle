import { Router } from 'express';
import { requireRole } from '../middleware/requireRole.js';
import {
  getSystemSettingsHandler,
  putSystemSettingsHandler,
  emailSimulationTestHandler
} from '../controllers/settings.controller.js';

const router = Router();

router.get('/system', requireRole(['ADMIN']), getSystemSettingsHandler);
router.put('/system', requireRole(['ADMIN']), putSystemSettingsHandler);
router.post('/email/test', requireRole(['ADMIN']), emailSimulationTestHandler);

export default router;

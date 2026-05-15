import { Router } from 'express';
import { requireRole } from '../middleware/requireRole.js';
import {
  listHandler,
  unreadCountHandler,
  markReadHandler,
  markAllReadHandler,
  getPreferencesHandler,
  savePreferencesHandler
} from '../controllers/notifications.controller.js';

const router = Router();

router.get('/', listHandler);
router.get('/unread-count', unreadCountHandler);
router.post('/mark-all-read', requireRole(['ADMIN', 'EVENT_MANAGER']), markAllReadHandler);
router.get('/preferences', getPreferencesHandler);
router.put('/preferences', requireRole(['ADMIN', 'EVENT_MANAGER']), savePreferencesHandler);
router.patch('/:id/read', requireRole(['ADMIN', 'EVENT_MANAGER']), markReadHandler);

export default router;

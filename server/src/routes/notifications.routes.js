import { Router } from 'express';
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
router.post('/mark-all-read', markAllReadHandler);
router.get('/preferences', getPreferencesHandler);
router.put('/preferences', savePreferencesHandler);
router.patch('/:id/read', markReadHandler);

export default router;

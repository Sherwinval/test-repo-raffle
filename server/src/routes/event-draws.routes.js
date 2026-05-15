import { Router } from 'express';
import { executeDrawHandler, confirmWinnerHandler, resetEventDrawsHandler } from '../controllers/draws.controller.js';
import { requireRole } from '../middleware/requireRole.js';

const router = Router({ mergeParams: true });

router.post('/execute', requireRole(['ADMIN', 'EVENT_MANAGER']), executeDrawHandler);
router.post('/confirm', requireRole(['ADMIN', 'EVENT_MANAGER']), confirmWinnerHandler);
router.post('/reset', requireRole(['ADMIN', 'EVENT_MANAGER']), resetEventDrawsHandler);

export default router;

import { Router } from 'express';
import { listDrawsHandler, getDrawHandler, voidDrawHandler, exportDrawsHandler } from '../controllers/draws.controller.js';
import { requireRole } from '../middleware/requireRole.js';

const router = Router();

router.get('/', listDrawsHandler);
router.get('/export', exportDrawsHandler);
router.get('/:id', getDrawHandler);
router.post('/:id/void', requireRole(['ADMIN']), voidDrawHandler);

export default router;

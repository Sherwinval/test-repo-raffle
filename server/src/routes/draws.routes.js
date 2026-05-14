import { Router } from 'express';
import { listDrawsHandler, getDrawHandler, voidDrawHandler, exportDrawsHandler } from '../controllers/draws.controller.js';

const router = Router();

router.get('/', listDrawsHandler);
router.get('/export', exportDrawsHandler);
router.get('/:id', getDrawHandler);
router.post('/:id/void', voidDrawHandler);

export default router;

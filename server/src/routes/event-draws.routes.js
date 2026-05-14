import { Router } from 'express';
import { executeDrawHandler, confirmWinnerHandler, resetEventDrawsHandler } from '../controllers/draws.controller.js';

const router = Router({ mergeParams: true });

router.post('/execute', executeDrawHandler);
router.post('/confirm', confirmWinnerHandler);
router.post('/reset', resetEventDrawsHandler);

export default router;

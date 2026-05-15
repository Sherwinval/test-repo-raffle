import { Router } from 'express';
import { getRules, putRules, getRulesPreview } from '../controllers/rules.controller.js';
import { requireRole } from '../middleware/requireRole.js';

const router = Router({ mergeParams: true });

router.get('/', getRules);
router.put('/', requireRole(['ADMIN', 'EVENT_MANAGER']), putRules);
router.get('/preview', getRulesPreview);

export default router;

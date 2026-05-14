import { Router } from 'express';
import { getRules, putRules, getRulesPreview } from '../controllers/rules.controller.js';

const router = Router({ mergeParams: true });

router.get('/', getRules);
router.put('/', putRules);
router.get('/preview', getRulesPreview);

export default router;

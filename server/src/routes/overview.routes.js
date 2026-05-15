import { Router } from 'express';
import { getOverviewHandler } from '../controllers/overview.controller.js';

const router = Router();

router.get('/', getOverviewHandler);

export default router;

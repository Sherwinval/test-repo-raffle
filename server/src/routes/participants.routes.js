import { Router } from 'express';
import { getParticipantStats } from '../controllers/participants.controller.js';

const router = Router();

router.get('/stats', getParticipantStats);

export default router;

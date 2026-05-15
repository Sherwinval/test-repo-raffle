import { Router } from 'express';
import { requireRole } from '../middleware/requireRole.js';
import {
  listParticipants,
  getParticipant,
  updateParticipant,
  mergeParticipants,
  bulkTagParticipants,
  getParticipantStats,
  getParticipantFacets
} from '../controllers/participants.controller.js';

const router = Router();

router.get('/', listParticipants);
router.get('/stats', getParticipantStats);
router.get('/facets', getParticipantFacets);
router.post('/merge', requireRole(['ADMIN', 'EVENT_MANAGER']), mergeParticipants);
router.post('/bulk-tag', requireRole(['ADMIN', 'EVENT_MANAGER']), bulkTagParticipants);
router.get('/:id', getParticipant);
router.patch('/:id', requireRole(['ADMIN', 'EVENT_MANAGER']), updateParticipant);

export default router;

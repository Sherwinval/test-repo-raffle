import { Router } from 'express';
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
router.post('/merge', mergeParticipants);
router.post('/bulk-tag', bulkTagParticipants);
router.get('/:id', getParticipant);
router.patch('/:id', updateParticipant);

export default router;

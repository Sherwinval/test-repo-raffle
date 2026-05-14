import { Router } from 'express';
import { listEvents, createEvent, deleteEvent, listEventAudit, createEventAudit } from '../controllers/events.controller.js';

const router = Router();

router.get('/', listEvents);
router.post('/', createEvent);
router.get('/:eventId/audit', listEventAudit);
router.post('/:eventId/audit', createEventAudit);
router.delete('/:eventId', deleteEvent);

export default router;

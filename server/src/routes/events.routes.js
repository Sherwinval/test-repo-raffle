import { Router } from 'express';
import { listEvents, createEvent, deleteEvent } from '../controllers/events.controller.js';

const router = Router();

router.get('/', listEvents);
router.post('/', createEvent);
router.delete('/:eventId', deleteEvent);

export default router;

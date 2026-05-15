import { Router } from 'express';
import { listEvents, createEvent, publishEvent, deleteEvent, listEventAudit, createEventAudit } from '../controllers/events.controller.js';
import { requireRole } from '../middleware/requireRole.js';
import { validate } from '../middleware/validate.js';
import { createEventSchema } from '../schemas/events.schema.js';

const router = Router();

router.get('/', listEvents);
router.post('/', requireRole(['ADMIN', 'EVENT_MANAGER']), validate(createEventSchema), createEvent);
router.post('/:eventId/publish', requireRole(['ADMIN', 'EVENT_MANAGER']), publishEvent);
router.get('/:eventId/audit', listEventAudit);
router.post('/:eventId/audit', requireRole(['ADMIN', 'EVENT_MANAGER']), createEventAudit);
router.delete('/:eventId', requireRole(['ADMIN']), deleteEvent);

export default router;

import { Router } from 'express';
import uploadRoutes from './upload.routes.js';
import eventsRoutes from './events.routes.js';
import entriesRoutes from './entries.routes.js';
import participantsRoutes from './participants.routes.js';

const router = Router();

router.use('/upload', uploadRoutes);
router.use('/events', eventsRoutes);
router.use('/events/:eventId/entries', entriesRoutes);
router.use('/participants', participantsRoutes);

export default router;

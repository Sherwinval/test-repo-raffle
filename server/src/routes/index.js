import { Router } from 'express';
import uploadRoutes from './upload.routes.js';
import eventsRoutes from './events.routes.js';
import entriesRoutes from './entries.routes.js';
import participantsRoutes from './participants.routes.js';
import rulesRoutes from './rules.routes.js';
import eventDrawsRoutes from './event-draws.routes.js';
import drawsRoutes from './draws.routes.js';
import notificationsRoutes from './notifications.routes.js';
import settingsRoutes from './settings.routes.js';
import overviewRoutes from './overview.routes.js';

const router = Router();

router.use('/upload', uploadRoutes);
router.use('/events', eventsRoutes);
router.use('/events/:eventId/entries', entriesRoutes);
router.use('/events/:eventId/rules', rulesRoutes);
router.use('/events/:eventId/draws', eventDrawsRoutes);
router.use('/participants', participantsRoutes);
router.use('/draws', drawsRoutes);
router.use('/notifications', notificationsRoutes);
router.use('/settings', settingsRoutes);
router.use('/overview', overviewRoutes);

export default router;

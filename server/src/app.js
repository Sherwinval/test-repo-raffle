import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';
import routes from './routes/index.js';
import { requestIdMiddleware } from './middleware/request-id.js';
import { httpLogger } from './middleware/http-logger.js';
import { errorHandler, notFoundHandler } from './middleware/error-handler.js';

const app = express();
const webOrigin = process.env.WEB_ORIGIN || 'http://localhost:5173';

app.set('trust proxy', 1);
app.use(requestIdMiddleware);
app.use(httpLogger);
app.use(cors({ origin: webOrigin, credentials: true }));
app.use(helmet());
app.use(express.json({ limit: '10mb' }));

app.use('/api', rateLimit({ windowMs: 60000, limit: 100, skip: (req) => req.path.startsWith('/upload/progress/') || req.path.includes('/bulk/progress/'), standardHeaders: true, legacyHeaders: false }));
app.use('/api/upload/progress', rateLimit({ windowMs: 60000, limit: 600, standardHeaders: true, legacyHeaders: false }));
app.use('/api/upload', rateLimit({ windowMs: 60000, limit: 10, standardHeaders: true, legacyHeaders: false }));

app.get('/health', (_req, res) => res.status(200).json({ ok: true }));
app.get('/health/deep', async (_req, res) => {
  const db = mongoose.connection.readyState === 1 ? 'up' : 'down';
  res.status(db === 'up' ? 200 : 503).json({ ok: db === 'up', db });
});

app.use('/api/v1', routes);
app.use('/api', routes);
app.use(notFoundHandler);
app.use(errorHandler);

export default app;

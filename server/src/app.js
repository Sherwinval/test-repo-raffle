import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import routes from './routes/index.js';
import { requestIdMiddleware } from './middleware/request-id.js';
import { httpLogger } from './middleware/http-logger.js';
import { errorHandler, notFoundHandler } from './middleware/error-handler.js';
import prisma from './prisma.js';

const app = express();

const webOrigin = process.env.WEB_ORIGIN || 'http://localhost:5173';

app.set('trust proxy', 1);
app.use(requestIdMiddleware);
app.use(httpLogger);
app.use(
  cors({
    origin: webOrigin,
    credentials: true
  })
);
app.use(helmet());
app.use(express.json({ limit: '1mb' }));

app.use(
  '/api',
  rateLimit({
    windowMs: 60 * 1000,
    limit: 100,
    skip: (req) => req.path.startsWith('/upload/progress/'),
    standardHeaders: true,
    legacyHeaders: false
  })
);

app.use(
  '/api/upload/progress',
  rateLimit({
    windowMs: 60 * 1000,
    limit: 600,
    standardHeaders: true,
    legacyHeaders: false
  })
);

app.use(
  '/api/upload',
  rateLimit({
    windowMs: 60 * 1000,
    limit: 10,
    standardHeaders: true,
    legacyHeaders: false
  })
);

app.get('/health', (_req, res) => {
  res.status(200).json({ ok: true });
});

app.get('/health/deep', async (_req, res, next) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({ ok: true, db: 'up' });
  } catch (err) {
    next(err);
  }
});

app.use('/api/v1', routes);
app.use('/api', routes);
app.use(notFoundHandler);
app.use(errorHandler);

export default app;

import dotenv from 'dotenv';
import app from './app.js';
import mongoose from 'mongoose';
import { logger } from './logger.js';
import { validateEnv } from './config/env.js';
import { connectDB } from './config/db.js';

dotenv.config();
validateEnv();
await connectDB();

const port = Number(process.env.PORT || 5000);
const server = app.listen(port, () => logger.info({ port }, 'server listening'));

let shuttingDown = false;
async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info({ signal }, 'graceful shutdown started');
  server.close(async () => {
    try {
      await mongoose.disconnect();
      logger.info('graceful shutdown complete');
      process.exit(0);
    } catch (err) {
      logger.error({ err }, 'graceful shutdown failed');
      process.exit(1);
    }
  });
  setTimeout(() => { logger.error('forced shutdown timeout reached'); process.exit(1); }, 15000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

import pinoHttp from 'pino-http';
import { logger } from '../logger.js';

export const httpLogger = pinoHttp({
  logger,
  customProps(req) {
    return { requestId: req.id };
  },
  serializers: {
    req(req) {
      return {
        id: req.id,
        method: req.method,
        url: req.url
      };
    }
  }
});


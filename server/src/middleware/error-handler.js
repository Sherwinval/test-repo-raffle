import { HttpError } from '../utils/httpError.js';
import { logger } from '../logger.js';

export function notFoundHandler(req, _res, next) {
  next(new HttpError(404, 'NOT_FOUND', 'Route not found.'));
}

export function errorHandler(err, req, res, _next) {
  const status = Number(err?.status || 500);
  const code = err?.code || (status >= 500 ? 'INTERNAL' : 'ERROR');
  const message = status >= 500 ? 'Internal server error.' : err?.message || 'Request failed.';
  const details = err?.details;

  logger.error(
    {
      requestId: req.id,
      path: req.originalUrl,
      method: req.method,
      err
    },
    'request failed'
  );

  res.status(status).json({
    error: {
      code,
      message,
      ...(details ? { details } : {})
    },
    requestId: req.id
  });
}


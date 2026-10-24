import { env } from '../config/env.js';

/**
 * Central error handler middleware.
 * Produces a consistent JSON error response shape:
 * { success: false, message: string, errors?: any, stack?: string }
 */
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  // Multer v2 errors (file size, unexpected field, etc.)
  if (err.name === 'MulterError') {
    const msg =
      err.code === 'LIMIT_FILE_SIZE'
        ? `File too large. Maximum size is 4 MB.`
        : `File upload error: ${err.message}`;
    return res.status(400).json({ success: false, message: msg });
  }

  // Express body-parser / JSON parse errors (e.g., payload too large, malformed JSON)
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ success: false, message: 'Invalid JSON in request body.' });
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ success: false, message: 'Request body too large.' });
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue ?? {})[0] ?? 'field';
    return res.status(409).json({
      success: false,
      message: `A record with that ${field} already exists.`,
    });
  }

  // Mongoose cast errors (bad ObjectId, wrong type) → 422
  if (err.name === 'CastError') {
    return res.status(422).json({
      success: false,
      message: `Invalid value for field '${err.path}': ${err.value}`,
    });
  }

  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({
      success: false,
      message: messages.join('. '),
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired authentication token.',
    });
  }

  // Zod validation errors forwarded from validators
  if (err.name === 'ZodError') {
    return res.status(400).json({
      success: false,
      message: 'Validation failed.',
      errors: err.errors.map((e) => ({
        path: Array.isArray(e.path) ? e.path.join('.') : String(e.path),
        message: e.message,
      })),
    });
  }

  // CORS errors thrown by the cors middleware
  if (err.message && err.message.startsWith('CORS policy:')) {
    return res.status(403).json({ success: false, message: err.message });
  }

  // Application-level errors with explicit status
  const status = err.statusCode ?? err.status ?? 500;
  const message = err.message ?? 'Internal server error.';

  res.status(status).json({
    success: false,
    message,
    ...(env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
}

/**
 * 404 Not Found handler – must be registered after all routes.
 */
export function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
}

/**
 * Convenience: create an error with a specific HTTP status.
 */
export function createError(statusCode, message) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

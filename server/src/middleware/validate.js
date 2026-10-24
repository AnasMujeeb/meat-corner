import { ZodError } from 'zod';
import { createError } from './errorHandler.js';

/**
 * Returns an Express middleware that validates req.body against a Zod schema.
 * On failure, throws a structured 400 with field-level messages.
 *
 * @param {import('zod').ZodTypeAny} schema
 * @param {'body'|'query'|'params'} source
 */
export function validate(schema, source = 'body') {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const errors = result.error.errors.map((e) => ({
        path: e.path.join('.'),
        message: e.message,
      }));
      const err = createError(400, 'Validation failed.');
      err.name = 'ZodError';
      err.errors = errors;
      return next(err);
    }
    // Replace source with the parsed (coerced / stripped) data
    req[source] = result.data;
    next();
  };
}

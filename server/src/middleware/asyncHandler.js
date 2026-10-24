/**
 * Wraps an async Express route handler to automatically catch rejected promises
 * and forward them to the next() error handler.
 *
 * @param {Function} fn - Async route handler
 * @returns {Function} Express middleware
 */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

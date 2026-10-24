import { createHash } from 'crypto';

/**
 * Set standard public-API cache headers + ETag, and handle 304 conditionals.
 *
 * Must be called BEFORE res.json() or res.send().
 * Returns true if a 304 was sent (caller should return early).
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {any} data - The JSON data to be sent (used to generate ETag)
 * @param {number} maxAgeSeconds
 * @param {number} staleWhileRevalidate
 * @returns {boolean} - true if 304 was sent
 */
export function setCacheHeaders(req, res, data, maxAgeSeconds = 60, staleWhileRevalidate = 30) {
  res.set('Cache-Control', `public, max-age=${maxAgeSeconds}, stale-while-revalidate=${staleWhileRevalidate}`);

  // Generate a strong ETag from the serialized response data
  const body = JSON.stringify(data);
  const etag = `"${createHash('sha1').update(body).digest('hex').slice(0, 16)}"`;
  res.set('ETag', etag);

  // Check If-None-Match for 304
  const ifNoneMatch = req.headers['if-none-match'];
  if (ifNoneMatch && ifNoneMatch === etag) {
    res.status(304).end();
    return true; // 304 sent – caller must NOT call res.json()
  }

  return false;
}

/**
 * Paginate a Mongoose query.
 *
 * @param {object} params
 * @param {import('mongoose').Model} params.Model
 * @param {object} params.filter
 * @param {object} params.projection
 * @param {object} params.sort
 * @param {number} params.page - 1-based
 * @param {number} params.limit
 * @param {Function} [params.queryModifier] - Optional: receives the query object for .populate() etc.
 * @returns {Promise<{ data: any[], total: number, page: number, totalPages: number }>}
 */
export async function paginate({ Model, filter, projection, sort, page, limit, queryModifier }) {
  const safePage = Math.max(1, page);
  const safeLimit = Math.min(100, Math.max(1, limit));
  const skip = (safePage - 1) * safeLimit;

  let q = Model.find(filter, projection).sort(sort).skip(skip).limit(safeLimit).lean();

  if (queryModifier) {
    q = queryModifier(q);
  }

  const [data, total] = await Promise.all([q, Model.countDocuments(filter)]);

  return {
    data,
    total,
    page: safePage,
    totalPages: Math.ceil(total / safeLimit),
  };
}

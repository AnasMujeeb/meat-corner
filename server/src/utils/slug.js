import slugify from 'slugify';

/**
 * Generate a URL-safe slug from a string.
 * Slugify options: lowercase, strict (removes non-word chars).
 */
export function toSlug(text) {
  return slugify(text, { lower: true, strict: true, trim: true });
}

/**
 * Ensure a slug is unique within a Mongoose model.
 * Appends an incrementing suffix if the base slug is taken.
 *
 * @param {import('mongoose').Model} Model
 * @param {string} baseSlug
 * @param {string|null} excludeId - Document _id to exclude (for updates)
 * @returns {Promise<string>}
 */
export async function uniqueSlug(Model, baseSlug, excludeId = null) {
  let slug = baseSlug;
  let counter = 1;

  while (true) {
    const query = { slug };
    if (excludeId) {
      query._id = { $ne: excludeId };
    }
    const existing = await Model.findOne(query).lean();
    if (!existing) return slug;
    slug = `${baseSlug}-${counter++}`;
  }
}

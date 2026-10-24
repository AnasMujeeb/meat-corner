import MenuItem from '../models/MenuItem.js';
import Category from '../models/Category.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { createError } from '../middleware/errorHandler.js';
import { toSlug, uniqueSlug } from '../utils/slug.js';
import { setCacheHeaders, paginate } from '../utils/helpers.js';
import { deleteImage } from '../services/storage.js';

// ─── Public ───────────────────────────────────────────────────────────────────

export const publicListMenu = asyncHandler(async (req, res) => {
  const { category, tag, q, page, limit } = req.query;

  const filter = { isAvailable: true };

  if (category) {
    const cat = await Category.findOne({ slug: category, isActive: true }).select('_id').lean();
    if (!cat) {
      const payload = { success: true, data: [], total: 0, page: 1, totalPages: 0 };
      if (setCacheHeaders(req, res, payload, 60, 30)) return;
      return res.json(payload);
    }
    filter.category = cat._id;
  }

  if (tag) {
    filter.tags = tag;
  }

  if (q) {
    filter.$text = { $search: q };
  }

  const projection = {
    name: 1, slug: 1, description: 1, category: 1,
    price: 1, images: 1, tags: 1, allergens: 1,
    nutrition: 1, options: 1, order: 1,
  };

  const sort = q ? { score: { $meta: 'textScore' } } : { order: 1, createdAt: 1 };

  const result = await paginate({
    Model: MenuItem,
    filter,
    projection,
    sort,
    page: Number(page) || 1,
    limit: Number(limit) || 20,
    queryModifier: (query) => query.populate('category', 'name slug'),
  });

  const payload = { success: true, ...result };
  if (setCacheHeaders(req, res, payload, 60, 30)) return;
  res.json(payload);
});

export const publicGetMenuItem = asyncHandler(async (req, res) => {
  const item = await MenuItem.findOne({ slug: req.params.slug, isAvailable: true })
    .populate('category', 'name slug')
    .lean();

  if (!item) throw createError(404, 'Menu item not found.');

  const payload = { success: true, data: item };
  if (setCacheHeaders(req, res, payload, 120, 60)) return;
  res.json(payload);
});

// ─── Admin – List / Get ───────────────────────────────────────────────────────

export const adminListMenu = asyncHandler(async (req, res) => {
  const { category, tag, q, page, limit, available } = req.query;

  const filter = {};

  if (category) {
    const cat = await Category.findOne({ slug: category }).select('_id').lean();
    if (cat) filter.category = cat._id;
  }
  if (tag) filter.tags = tag;
  if (available === 'true') filter.isAvailable = true;
  if (available === 'false') filter.isAvailable = false;
  if (q) filter.$text = { $search: q };

  const sort = q ? { score: { $meta: 'textScore' } } : { order: 1, createdAt: 1 };

  const result = await paginate({
    Model: MenuItem,
    filter,
    projection: {},
    sort,
    page: Number(page) || 1,
    limit: Number(limit) || 20,
    queryModifier: (query) => query.populate('category', 'name slug'),
  });

  res.json({ success: true, ...result });
});

export const adminGetMenuItem = asyncHandler(async (req, res) => {
  const item = await MenuItem.findById(req.params.id).populate('category', 'name slug').lean();
  if (!item) throw createError(404, 'Menu item not found.');
  res.json({ success: true, data: item });
});

// ─── Admin – Create / Update / Delete ────────────────────────────────────────

export const createMenuItem = asyncHandler(async (req, res) => {
  const { name, category, ...rest } = req.body;

  // Validate category exists
  const cat = await Category.findById(category).lean();
  if (!cat) throw createError(404, 'Category not found.');

  const baseSlug = toSlug(name);
  const slug = await uniqueSlug(MenuItem, baseSlug);

  const item = await MenuItem.create({ name, slug, category, ...rest });
  const populated = await item.populate('category', 'name slug');

  res.status(201).json({ success: true, data: populated });
});

export const updateMenuItem = asyncHandler(async (req, res) => {
  const item = await MenuItem.findById(req.params.id);
  if (!item) throw createError(404, 'Menu item not found.');

  const { name, category, images, ...rest } = req.body;

  if (name && name !== item.name) {
    const baseSlug = toSlug(name);
    item.slug = await uniqueSlug(MenuItem, baseSlug, item._id);
    item.name = name;
  }

  if (category && category.toString() !== item.category.toString()) {
    const cat = await Category.findById(category).lean();
    if (!cat) throw createError(404, 'Category not found.');
    item.category = category;
  }

  // If images array is being replaced, delete old images no longer present
  if (images !== undefined) {
    const newUrls = new Set((images || []).map((img) => img.url));
    for (const oldImg of item.images) {
      if (!newUrls.has(oldImg.url)) {
        deleteImage(oldImg.url).catch(() => {});
      }
    }
    item.images = images;
  }

  Object.assign(item, rest);
  await item.save();

  const populated = await item.populate('category', 'name slug');
  res.json({ success: true, data: populated });
});

export const deleteMenuItem = asyncHandler(async (req, res) => {
  const item = await MenuItem.findById(req.params.id);
  if (!item) throw createError(404, 'Menu item not found.');

  // Delete all associated image files from disk
  for (const img of item.images) {
    deleteImage(img.url).catch(() => {});
  }

  await item.deleteOne();
  res.json({ success: true, message: 'Menu item deleted.' });
});

export const toggleAvailability = asyncHandler(async (req, res) => {
  const item = await MenuItem.findById(req.params.id);
  if (!item) throw createError(404, 'Menu item not found.');
  item.isAvailable = !item.isAvailable;
  await item.save();
  res.json({ success: true, data: { _id: item._id, isAvailable: item.isAvailable } });
});

import MenuItem from '../models/MenuItem.js';
import Category from '../models/Category.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { createError } from '../middleware/errorHandler.js';
import { toSlug, uniqueSlug } from '../utils/slug.js';
import { setCacheHeaders, paginate } from '../utils/helpers.js';
import { deleteImage } from '../services/storage.js';

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const ARABIC_CHAR_REGEX = /[\u0600-\u06FF]/;

// ─── Public ───────────────────────────────────────────────────────────────────

export const publicListMenu = asyncHandler(async (req, res) => {
  const { category, tag, badge, guestFavourite, q, page, limit } = req.query;

  const filter = { isAvailable: true };

  if (guestFavourite === 'true') {
    filter.isGuestFavourite = true;
  } else if (guestFavourite === 'false') {
    filter.isGuestFavourite = false;
  }

  if (category) {
    const cat = await Category.findOne({ slug: category, isActive: { $ne: false } }).select('_id').lean();
    if (!cat) {
      const payload = { success: true, data: [], total: 0, page: 1, totalPages: 0 };
      if (setCacheHeaders(req, res, payload, 60, 30)) return;
      return res.json(payload);
    }
    filter.$or = [{ category: cat._id }, { extraCategories: cat._id }];
  } else {
    // Only return items belonging to active categories (as primary or extra)
    const activeCategories = await Category.find({ isActive: { $ne: false } }).select('_id').lean();
    const activeCatIds = activeCategories.map((c) => c._id);
    filter.$or = [
      { category: { $in: activeCatIds } },
      { extraCategories: { $in: activeCatIds } },
    ];
  }

  if (tag) {
    filter.tags = tag;
  }

  if (badge) {
    filter.badges = String(badge).toLowerCase().trim();
  }

  let sort = { order: 1, createdAt: 1 };
  if (q) {
    if (ARABIC_CHAR_REGEX.test(q)) {
      const escaped = escapeRegex(q.trim());
      const arRegex = new RegExp(escaped, 'i');
      const searchOr = [
        { nameAr: arRegex },
        { descriptionAr: arRegex },
        { name: arRegex },
      ];
      if (filter.$or) {
        filter.$and = [{ $or: filter.$or }, { $or: searchOr }];
        delete filter.$or;
      } else {
        filter.$or = searchOr;
      }
      sort = { order: 1, createdAt: 1 };
    } else {
      filter.$text = { $search: q };
      sort = { score: { $meta: 'textScore' } };
    }
  }

  const projection = {
    name: 1, nameAr: 1, slug: 1, description: 1, descriptionAr: 1, category: 1,
    extraCategories: 1,
    price: 1, images: 1, tags: 1, allergens: 1,
    nutrition: 1, options: 1, isAvailable: 1, isGuestFavourite: 1, order: 1, badges: 1,
    updatedAt: 1,
  };

  const result = await paginate({
    Model: MenuItem,
    filter,
    projection,
    sort,
    page: Number(page) || 1,
    limit: Number(limit) || 20,
    queryModifier: (query) => query.populate('category', 'name slug').populate('extraCategories', 'name slug'),
  });

  const payload = { success: true, ...result };
  if (setCacheHeaders(req, res, payload, 60, 30)) return;
  res.json(payload);
});

export const publicGetMenuItem = asyncHandler(async (req, res) => {
  const item = await MenuItem.findOne({ slug: req.params.slug, isAvailable: true })
    .populate('category', 'name slug')
    .populate('extraCategories', 'name slug')
    .lean();

  if (!item) throw createError(404, 'Menu item not found.');

  const payload = { success: true, data: item };
  if (setCacheHeaders(req, res, payload, 120, 60)) return;
  res.json(payload);
});

// ─── Admin – List / Get ───────────────────────────────────────────────────────

export const adminListMenu = asyncHandler(async (req, res) => {
  const { category, tag, badge, guestFavourite, q, page, limit, available } = req.query;

  const filter = {};

  if (guestFavourite === 'true') {
    filter.isGuestFavourite = true;
  } else if (guestFavourite === 'false') {
    filter.isGuestFavourite = false;
  }

  if (category) {
    const cat = await Category.findOne({ slug: category }).select('_id').lean();
    if (cat) {
      filter.$or = [{ category: cat._id }, { extraCategories: cat._id }];
    }
  }
  if (tag) filter.tags = tag;
  if (badge) filter.badges = String(badge).toLowerCase().trim();
  if (available === 'true') filter.isAvailable = true;
  if (available === 'false') filter.isAvailable = false;

  let sort = { order: 1, createdAt: 1 };
  if (q) {
    if (ARABIC_CHAR_REGEX.test(q)) {
      const escaped = escapeRegex(q.trim());
      const arRegex = new RegExp(escaped, 'i');
      const searchOr = [
        { nameAr: arRegex },
        { descriptionAr: arRegex },
        { name: arRegex },
      ];
      if (filter.$or) {
        filter.$and = [{ $or: filter.$or }, { $or: searchOr }];
        delete filter.$or;
      } else {
        filter.$or = searchOr;
      }
      sort = { order: 1, createdAt: 1 };
    } else {
      filter.$text = { $search: q };
      sort = { score: { $meta: 'textScore' } };
    }
  }

  const result = await paginate({
    Model: MenuItem,
    filter,
    projection: {},
    sort,
    page: Number(page) || 1,
    limit: Number(limit) || 20,
    queryModifier: (query) => query.populate('category', 'name slug').populate('extraCategories', 'name slug'),
  });

  res.json({ success: true, ...result });
});

export const adminGetMenuItem = asyncHandler(async (req, res) => {
  const item = await MenuItem.findById(req.params.id)
    .populate('category', 'name slug')
    .populate('extraCategories', 'name slug')
    .lean();
  if (!item) throw createError(404, 'Menu item not found.');
  res.json({ success: true, data: item });
});

// ─── Admin – Create / Update / Delete ────────────────────────────────────────

export const createMenuItem = asyncHandler(async (req, res) => {
  const { name, category, extraCategories, ...rest } = req.body;

  // Validate primary category exists
  const cat = await Category.findById(category).lean();
  if (!cat) throw createError(404, 'Category not found.');

  // Validate extraCategories: no duplicates, must exist, must not equal the primary
  let cleanedExtraCategories = [];
  if (Array.isArray(extraCategories) && extraCategories.length > 0) {
    const rawIds = extraCategories.map((id) => id?.toString?.() || String(id));
    // Filter out primary category and de-duplicate
    const primaryIdStr = cat._id.toString();
    const uniqueIds = Array.from(new Set(rawIds.filter((id) => id && id !== primaryIdStr)));

    if (uniqueIds.length > 0) {
      const foundCats = await Category.find({ _id: { $in: uniqueIds } }).select('_id').lean();
      if (foundCats.length !== uniqueIds.length) {
        throw createError(400, 'One or more extra categories not found.');
      }
      cleanedExtraCategories = foundCats.map((c) => c._id);
    }
  }

  const baseSlug = toSlug(name);
  const slug = await uniqueSlug(MenuItem, baseSlug);

  const item = await MenuItem.create({
    name,
    slug,
    category,
    extraCategories: cleanedExtraCategories,
    ...rest,
  });
  const populated = await item.populate([
    { path: 'category', select: 'name slug' },
    { path: 'extraCategories', select: 'name slug' },
  ]);

  res.status(201).json({ success: true, data: populated });
});

export const updateMenuItem = asyncHandler(async (req, res) => {
  const item = await MenuItem.findById(req.params.id);
  if (!item) throw createError(404, 'Menu item not found.');

  const { name, category, extraCategories, images, ...rest } = req.body;

  if (name && name !== item.name) {
    const baseSlug = toSlug(name);
    item.slug = await uniqueSlug(MenuItem, baseSlug, item._id);
    item.name = name;
  }

  let currentPrimaryIdStr = (category || item.category).toString();
  if (category && category.toString() !== item.category.toString()) {
    const cat = await Category.findById(category).lean();
    if (!cat) throw createError(404, 'Category not found.');
    item.category = category;
    currentPrimaryIdStr = cat._id.toString();
  }

  if (extraCategories !== undefined) {
    let cleanedExtraCategories = [];
    if (Array.isArray(extraCategories) && extraCategories.length > 0) {
      const rawIds = extraCategories.map((id) => id?.toString?.() || String(id));
      const uniqueIds = Array.from(new Set(rawIds.filter((id) => id && id !== currentPrimaryIdStr)));

      if (uniqueIds.length > 0) {
        const foundCats = await Category.find({ _id: { $in: uniqueIds } }).select('_id').lean();
        if (foundCats.length !== uniqueIds.length) {
          throw createError(400, 'One or more extra categories not found.');
        }
        cleanedExtraCategories = foundCats.map((c) => c._id);
      }
    }
    item.extraCategories = cleanedExtraCategories;
  } else if (category && category.toString() !== item.category.toString()) {
    // If primary category changed but extraCategories wasn't explicitly passed,
    // ensure new primary category is stripped from existing extraCategories
    item.extraCategories = (item.extraCategories || []).filter(
      (ecId) => ecId.toString() !== currentPrimaryIdStr
    );
  }

  // If images array is being replaced, collect old images no longer present and delete only after saving
  let oldImagesToDelete = [];
  if (images !== undefined) {
    const newUrls = new Set((images || []).map((img) => img.url));
    oldImagesToDelete = (item.images || []).filter((oldImg) => !newUrls.has(oldImg.url));
    item.images = images;
  }

  Object.assign(item, rest);
  await item.save();

  for (const oldImg of oldImagesToDelete) {
    deleteImage(oldImg.url).catch(() => {});
  }

  const populated = await item.populate([
    { path: 'category', select: 'name slug' },
    { path: 'extraCategories', select: 'name slug' },
  ]);
  res.json({ success: true, data: populated });
});

export const deleteMenuItem = asyncHandler(async (req, res) => {
  const item = await MenuItem.findById(req.params.id);
  if (!item) throw createError(404, 'Menu item not found.');

  const imagesToDelete = item.images || [];

  await item.deleteOne();

  // Delete associated image files only if unreferenced
  for (const img of imagesToDelete) {
    if (img?.url) {
      deleteImage(img.url).catch(() => {});
    }
  }

  res.json({ success: true, message: 'Menu item deleted.' });
});

export const toggleAvailability = asyncHandler(async (req, res) => {
  const item = await MenuItem.findById(req.params.id);
  if (!item) throw createError(404, 'Menu item not found.');
  item.isAvailable = !item.isAvailable;
  await item.save();
  res.json({ success: true, data: { _id: item._id, isAvailable: item.isAvailable } });
});

export const toggleGuestFavourite = asyncHandler(async (req, res) => {
  const item = await MenuItem.findById(req.params.id);
  if (!item) throw createError(404, 'Menu item not found.');
  item.isGuestFavourite = !item.isGuestFavourite;
  await item.save();
  res.json({ success: true, data: { _id: item._id, isGuestFavourite: item.isGuestFavourite } });
});

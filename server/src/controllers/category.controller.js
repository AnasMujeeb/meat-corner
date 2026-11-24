import Category from '../models/Category.js';
import MenuItem from '../models/MenuItem.js';
import mongoose from 'mongoose';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { createError } from '../middleware/errorHandler.js';
import { toSlug, uniqueSlug } from '../utils/slug.js';
import { setCacheHeaders } from '../utils/helpers.js';
import { deleteImage } from '../services/storage.js';

// ─── Public ───────────────────────────────────────────────────────────────────

export const publicListCategories = asyncHandler(async (req, res) => {
  const categories = await Category.find({ isActive: { $ne: false } })
    .select('name nameAr slug description descriptionAr image sortOrder order')
    .sort({ sortOrder: 1, order: 1, createdAt: 1 })
    .lean();

  const formatted = categories.map((c) => ({
    ...c,
    sortOrder: c.sortOrder ?? c.order ?? 0,
    order: c.order ?? c.sortOrder ?? 0,
  }));

  const payload = { success: true, data: formatted };
  if (setCacheHeaders(req, res, payload, 120, 60)) return;
  res.json(payload);
});

// ─── Admin – List / Get ───────────────────────────────────────────────────────

export const listCategories = asyncHandler(async (req, res) => {
  const categories = await Category.find().sort({ sortOrder: 1, order: 1, createdAt: 1 }).lean();

  const itemCounts = await MenuItem.aggregate([
    {
      $project: {
        allCats: {
          $setUnion: [
            [{ $ifNull: ['$category', null] }],
            { $ifNull: ['$extraCategories', []] },
          ],
        },
      },
    },
    { $unwind: '$allCats' },
    { $match: { allCats: { $ne: null } } },
    { $group: { _id: '$allCats', count: { $sum: 1 } } },
  ]);
  const countMap = new Map(itemCounts.map((i) => [String(i._id), i.count]));

  const data = categories.map((c) => ({
    ...c,
    itemCount: countMap.get(String(c._id)) || 0,
    sortOrder: c.sortOrder ?? c.order ?? 0,
    order: c.order ?? c.sortOrder ?? 0,
  }));

  res.json({ success: true, data });
});

export const getCategory = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id).lean();
  if (!category) throw createError(404, 'Category not found.');
  res.json({
    success: true,
    data: {
      ...category,
      sortOrder: category.sortOrder ?? category.order ?? 0,
      order: category.order ?? category.sortOrder ?? 0,
    },
  });
});

// ─── Admin – Create / Update / Delete ────────────────────────────────────────

export const createCategory = asyncHandler(async (req, res) => {
  const { name, sortOrder, order, ...rest } = req.body;
  const baseSlug = toSlug(name);
  const slug = await uniqueSlug(Category, baseSlug);

  let resolvedSortOrder = sortOrder ?? order;
  if (resolvedSortOrder === undefined) {
    const lastCategory = await Category.findOne().sort({ sortOrder: -1, order: -1 }).select('sortOrder order').lean();
    resolvedSortOrder = lastCategory ? Math.max(lastCategory.sortOrder || 0, lastCategory.order || 0) + 1 : 0;
  }

  const category = await Category.create({
    name,
    slug,
    sortOrder: resolvedSortOrder,
    order: resolvedSortOrder,
    ...rest,
  });
  res.status(201).json({ success: true, data: category });
});

export const updateCategory = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);
  if (!category) throw createError(404, 'Category not found.');

  const { name, sortOrder, order, slug: _ignoredSlug, ...rest } = req.body;

  // Name updates, but slug NEVER changes on rename
  if (name) {
    category.name = name;
  }

  if (sortOrder !== undefined || order !== undefined) {
    const val = sortOrder ?? order;
    category.sortOrder = val;
    category.order = val;
  }

  // If image is being replaced or removed, delete old file only after saving
  const oldImageToDelete =
    'image' in rest && rest.image !== category.image && category.image
      ? category.image
      : null;

  Object.assign(category, rest);
  await category.save();

  if (oldImageToDelete) {
    deleteImage(oldImageToDelete).catch(() => {});
  }

  res.json({ success: true, data: category });
});

export const toggleCategoryActive = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);
  if (!category) throw createError(404, 'Category not found.');

  const isActive = typeof req.body.isActive === 'boolean' ? req.body.isActive : !category.isActive;
  category.isActive = isActive;
  await category.save();

  res.json({ success: true, data: category });
});

export const deleteCategory = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);
  if (!category) throw createError(404, 'Category not found.');

  // Refuse if category still has items (as primary or extra category)
  const itemCount = await MenuItem.countDocuments({
    $or: [{ category: category._id }, { extraCategories: category._id }],
  });
  if (itemCount > 0) {
    throw createError(
      409,
      `Move or delete its ${itemCount} items first, or hide the category instead.`
    );
  }

  const oldImage = category.image;

  await category.deleteOne();

  // Delete image files only if unreferenced
  if (oldImage) {
    deleteImage(oldImage).catch(() => {});
  }
  res.json({ success: true, message: 'Category deleted.' });
});

// ─── Admin – Reorder ─────────────────────────────────────────────────────────

export const reorderCategories = asyncHandler(async (req, res) => {
  const { ids } = req.body;

  const bulkOps = ids.map((id, index) => ({
    updateOne: {
      filter: { _id: id },
      update: { $set: { sortOrder: index, order: index } },
    },
  }));

  await Category.bulkWrite(bulkOps, { ordered: false });
  res.json({ success: true, message: `Reordered ${ids.length} categories.` });
});

// ─── Admin – Category Items ──────────────────────────────────────────────────

export const getCategoryItems = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw createError(400, 'Invalid category ID.');
  }

  const category = await Category.findById(id).lean();
  if (!category) {
    throw createError(404, 'Category not found.');
  }

  const items = await MenuItem.find({
    $or: [{ category: id }, { extraCategories: id }],
  })
    .sort({ sortOrder: 1, order: 1, createdAt: 1 })
    .populate('category', 'name nameAr slug')
    .lean();

  const formattedItems = items.map((item) => {
    const primaryCatIdStr = (item.category?._id || item.category || '').toString();
    const isAlsoShowIn = primaryCatIdStr !== id.toString();
    const mainCategoryName = isAlsoShowIn
      ? (item.category?.name || 'Other')
      : null;

    const rawImg = item.images?.[0];
    const thumbUrl = typeof rawImg === 'object'
      ? (rawImg?.thumbUrl || rawImg?.url || '')
      : (typeof rawImg === 'string' ? rawImg : '');

    return {
      _id: item._id,
      id: item._id,
      name: item.name,
      nameAr: item.nameAr || '',
      description: item.description || '',
      price: item.price,
      thumbUrl,
      isAvailable: item.isAvailable,
      isGuestFavourite: item.isGuestFavourite ?? false,
      isAlsoShowIn,
      mainCategoryName,
      sortOrder: item.sortOrder ?? item.order ?? 0,
      order: item.order ?? item.sortOrder ?? 0,
    };
  });

  res.json({
    success: true,
    data: formattedItems,
    count: formattedItems.length,
  });
});

export const reorderCategoryItems = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { itemIds } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw createError(400, 'Invalid category ID.');
  }

  const category = await Category.findById(id).lean();
  if (!category) {
    throw createError(404, 'Category not found.');
  }

  // 1. Fetch current items of this category (primary and extra)
  const currentItems = await MenuItem.find({
    $or: [{ category: id }, { extraCategories: id }],
  })
    .sort({ sortOrder: 1, order: 1, createdAt: 1 })
    .select('_id name sortOrder order createdAt')
    .lean();

  const currentIds = currentItems.map((item) => item._id.toString());
  const currentIdSet = new Set(currentIds);

  // 2. Strict verification: submitted itemIds must be EXACTLY the set of items currently in that category
  if (itemIds.length !== currentIds.length) {
    throw createError(
      400,
      `Item count mismatch: submitted ${itemIds.length} items, but category currently has ${currentIds.length} items.`
    );
  }

  const submittedSet = new Set(itemIds);
  if (submittedSet.size !== itemIds.length) {
    throw createError(400, 'Duplicate item IDs submitted in reorder list.');
  }

  for (const submittedId of itemIds) {
    if (!currentIdSet.has(submittedId)) {
      throw createError(
        400,
        `Item ${submittedId} does not belong to category ${id}. All items must belong to this category.`
      );
    }
  }

  // 3. Slot-swap calculation: collect current order values of these items
  // Preserve order value convention: check sortOrder ?? order
  const previousValues = currentItems.map((item) => ({
    _id: item._id.toString(),
    name: item.name,
    sortOrder: item.sortOrder ?? item.order ?? 0,
    order: item.order ?? 0,
  }));

  // Build clean slot values
  const rawSlots = currentItems.map((item) => item.sortOrder ?? item.order ?? 0);
  const uniqueSlots = Array.from(new Set(rawSlots)).sort((a, b) => a - b);
  let assignedSlots = [];

  // If slots have duplicates or missing sequence, build a clean ascending sequence 0, 1, 2...
  if (uniqueSlots.length !== currentItems.length) {
    assignedSlots = currentItems.map((_, index) => index);
  } else {
    assignedSlots = rawSlots.slice().sort((a, b) => a - b);
  }

  // Log single JSON line with old values before write so change can be undone
  console.log(
    JSON.stringify({
      action: 'REORDER_CATEGORY_ITEMS',
      categoryId: id,
      timestamp: new Date().toISOString(),
      previous: previousValues,
    })
  );

  // 4. Build single bulkWrite of updateOne operations setting { sortOrder: n }
  const bulkOps = itemIds.map((itemId, index) => {
    const newSortOrder = assignedSlots[index];
    return {
      updateOne: {
        filter: { _id: new mongoose.Types.ObjectId(itemId) },
        update: { $set: { sortOrder: newSortOrder } },
      },
    };
  });

  try {
    await MenuItem.bulkWrite(bulkOps, { ordered: true });
  } catch (err) {
    throw createError(500, `Bulk reorder failed: ${err.message}`);
  }

  // 5. Fetch updated items
  const updatedItems = await MenuItem.find({
    $or: [{ category: id }, { extraCategories: id }],
  })
    .sort({ sortOrder: 1, order: 1, createdAt: 1 })
    .populate('category', 'name nameAr slug')
    .lean();

  const formattedUpdatedItems = updatedItems.map((item) => {
    const primaryCatIdStr = (item.category?._id || item.category || '').toString();
    const isAlsoShowIn = primaryCatIdStr !== id.toString();
    const rawImg = item.images?.[0];
    const thumbUrl = typeof rawImg === 'object'
      ? (rawImg?.thumbUrl || rawImg?.url || '')
      : (typeof rawImg === 'string' ? rawImg : '');

    return {
      _id: item._id,
      id: item._id,
      name: item.name,
      nameAr: item.nameAr || '',
      description: item.description || '',
      price: item.price,
      thumbUrl,
      isAvailable: item.isAvailable,
      isGuestFavourite: item.isGuestFavourite ?? false,
      isAlsoShowIn,
      mainCategoryName: isAlsoShowIn ? (item.category?.name || 'Other') : null,
      sortOrder: item.sortOrder ?? item.order ?? 0,
      order: item.order ?? item.sortOrder ?? 0,
    };
  });

  res.json({
    success: true,
    message: `Reordered ${itemIds.length} items in category.`,
    data: formattedUpdatedItems,
    previous: previousValues,
  });
});

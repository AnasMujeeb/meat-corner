import Category from '../models/Category.js';
import MenuItem from '../models/MenuItem.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { createError } from '../middleware/errorHandler.js';
import { toSlug, uniqueSlug } from '../utils/slug.js';
import { setCacheHeaders } from '../utils/helpers.js';
import { deleteImage } from '../services/storage.js';

// ─── Public ───────────────────────────────────────────────────────────────────

export const publicListCategories = asyncHandler(async (req, res) => {
  const categories = await Category.find({ isActive: true })
    .select('name slug description image order')
    .sort({ order: 1, createdAt: 1 })
    .lean();

  const payload = { success: true, data: categories };
  if (setCacheHeaders(req, res, payload, 120, 60)) return;
  res.json(payload);
});

// ─── Admin – List / Get ───────────────────────────────────────────────────────

export const listCategories = asyncHandler(async (req, res) => {
  const categories = await Category.find().sort({ order: 1, createdAt: 1 }).lean();
  res.json({ success: true, data: categories });
});

export const getCategory = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id).lean();
  if (!category) throw createError(404, 'Category not found.');
  res.json({ success: true, data: category });
});

// ─── Admin – Create / Update / Delete ────────────────────────────────────────

export const createCategory = asyncHandler(async (req, res) => {
  const { name, ...rest } = req.body;
  const baseSlug = toSlug(name);
  const slug = await uniqueSlug(Category, baseSlug);

  const category = await Category.create({ name, slug, ...rest });
  res.status(201).json({ success: true, data: category });
});

export const updateCategory = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);
  if (!category) throw createError(404, 'Category not found.');

  const { name, ...rest } = req.body;

  if (name && name !== category.name) {
    const baseSlug = toSlug(name);
    category.slug = await uniqueSlug(Category, baseSlug, category._id);
    category.name = name;
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

export const deleteCategory = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);
  if (!category) throw createError(404, 'Category not found.');

  // Prevent deletion if items are assigned
  const itemCount = await MenuItem.countDocuments({ category: category._id });
  if (itemCount > 0) {
    throw createError(
      409,
      `Cannot delete: ${itemCount} menu item(s) are assigned to this category.`
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
      update: { $set: { order: index } },
    },
  }));

  await Category.bulkWrite(bulkOps, { ordered: false });
  res.json({ success: true, message: `Reordered ${ids.length} categories.` });
});

import OptionLibraryItem from '../models/OptionLibraryItem.js';
import MenuItem from '../models/MenuItem.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { createError } from '../middleware/errorHandler.js';
import { deleteImage } from '../services/storage.js';

/**
 * GET /api/admin/options-library
 * Optional query: ?category=sauce|side|other&available=true|false
 */
export const listOptionLibraryItems = asyncHandler(async (req, res) => {
  const { category, available } = req.query;
  const filter = {};
  if (category) filter.category = category;
  if (available === 'true') filter.isAvailable = true;
  if (available === 'false') filter.isAvailable = false;

  const items = await OptionLibraryItem.find(filter).sort({ category: 1, order: 1, name: 1 }).lean();
  res.json({ success: true, data: items });
});

/**
 * GET /api/admin/options-library/:id
 */
export const getOptionLibraryItem = asyncHandler(async (req, res) => {
  const item = await OptionLibraryItem.findById(req.params.id).lean();
  if (!item) throw createError(404, 'Option library item not found.');
  res.json({ success: true, data: item });
});

/**
 * POST /api/admin/options-library
 */
export const createOptionLibraryItem = asyncHandler(async (req, res) => {
  const { name, category, image, price, isAvailable, order } = req.body;

  const existing = await OptionLibraryItem.findOne({ name: name.trim() });
  if (existing) {
    throw createError(409, `An option with the name "${name.trim()}" already exists in the library.`);
  }

  const item = await OptionLibraryItem.create({
    name: name.trim(),
    category: category || 'sauce',
    image: image || { url: '', thumbUrl: '' },
    price: price || 0,
    isAvailable: isAvailable !== undefined ? isAvailable : true,
    order: order || 0,
  });

  res.status(201).json({ success: true, data: item });
});

/**
 * PUT /api/admin/options-library/:id
 * Updates library item and cascades updates to MenuItems referencing this libraryItemId.
 */
export const updateOptionLibraryItem = asyncHandler(async (req, res) => {
  const item = await OptionLibraryItem.findById(req.params.id);
  if (!item) throw createError(404, 'Option library item not found.');

  const { name, category, image, price, isAvailable, order } = req.body;

  if (name && name.trim() !== item.name) {
    const duplicate = await OptionLibraryItem.findOne({
      name: name.trim(),
      _id: { $ne: item._id },
    });
    if (duplicate) {
      throw createError(409, `An option with the name "${name.trim()}" already exists in the library.`);
    }
    item.name = name.trim();
  }

  if (category !== undefined) item.category = category;
  if (image !== undefined) item.image = image;
  if (price !== undefined) item.price = price;
  if (isAvailable !== undefined) item.isAvailable = isAvailable;
  if (order !== undefined) item.order = order;

  await item.save();

  // Cascade snapshot update to all MenuItems referencing this library item
  try {
    const matchingMenuItems = await MenuItem.find({
      'options.choices.libraryItemId': item._id,
    });

    for (const mItem of matchingMenuItems) {
      let modified = false;
      mItem.options.forEach((opt) => {
        opt.choices.forEach((choice) => {
          if (choice.libraryItemId && choice.libraryItemId.toString() === item._id.toString()) {
            choice.label = item.name;
            if (item.image?.url) {
              choice.image = {
                url: item.image.url,
                thumbUrl: item.image.thumbUrl || item.image.url,
              };
            }
            if (item.price !== undefined && item.price > 0 && (!choice.extraPrice || choice.extraPrice === 0)) {
              choice.extraPrice = item.price;
            }
            modified = true;
          }
        });
      });
      if (modified) {
        await mItem.save();
      }
    }
  } catch (err) {
    console.warn('⚠️  Could not cascade library update to MenuItems:', err.message);
  }

  res.json({ success: true, data: item });
});

/**
 * DELETE /api/admin/options-library/:id
 * Deletes the library item.
 * Strictly respects shared images: only deletes Blob if NO MenuItem is referencing the image URL.
 */
export const deleteOptionLibraryItem = asyncHandler(async (req, res) => {
  const item = await OptionLibraryItem.findById(req.params.id);
  if (!item) throw createError(404, 'Option library item not found.');

  const imageUrl = item.image?.url;
  await item.deleteOne();

  // Check if any MenuItem is still referencing this image
  if (imageUrl) {
    const inUse = await MenuItem.exists({
      $or: [
        { 'images.url': imageUrl },
        { 'images.thumbUrl': imageUrl },
        { 'options.choices.image.url': imageUrl },
        { 'options.choices.image.thumbUrl': imageUrl },
      ],
    });

    // Also check if any other library item uses the same image
    const inOtherLibraryItem = await OptionLibraryItem.exists({
      $or: [
        { 'image.url': imageUrl },
        { 'image.thumbUrl': imageUrl },
      ],
    });

    if (!inUse && !inOtherLibraryItem) {
      deleteImage(imageUrl).catch(() => {});
    }
  }

  res.json({ success: true, message: 'Library item deleted.' });
});

import Branch from '../models/Branch.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { createError } from '../middleware/errorHandler.js';
import { toSlug, uniqueSlug } from '../utils/slug.js';
import { setCacheHeaders } from '../utils/helpers.js';

// ─── Public ───────────────────────────────────────────────────────────────────

export const publicListBranches = asyncHandler(async (req, res) => {
  const branches = await Branch.find({ isActive: true })
    .select('name slug address phone mapUrl openingHours order')
    .sort({ order: 1 })
    .lean();

  const payload = { success: true, data: branches };
  if (setCacheHeaders(req, res, payload, 300, 60)) return;
  res.json(payload);
});

// ─── Admin ────────────────────────────────────────────────────────────────────

export const listBranches = asyncHandler(async (req, res) => {
  const branches = await Branch.find().sort({ order: 1 }).lean();
  res.json({ success: true, data: branches });
});

export const getBranch = asyncHandler(async (req, res) => {
  const branch = await Branch.findById(req.params.id).lean();
  if (!branch) throw createError(404, 'Branch not found.');
  res.json({ success: true, data: branch });
});

export const createBranch = asyncHandler(async (req, res) => {
  const { name, ...rest } = req.body;
  const baseSlug = toSlug(name);
  const slug = await uniqueSlug(Branch, baseSlug);
  const branch = await Branch.create({ name, slug, ...rest });
  res.status(201).json({ success: true, data: branch });
});

export const updateBranch = asyncHandler(async (req, res) => {
  const branch = await Branch.findById(req.params.id);
  if (!branch) throw createError(404, 'Branch not found.');

  const { name, ...rest } = req.body;
  if (name && name !== branch.name) {
    const baseSlug = toSlug(name);
    branch.slug = await uniqueSlug(Branch, baseSlug, branch._id);
    branch.name = name;
  }

  Object.assign(branch, rest);
  await branch.save();
  res.json({ success: true, data: branch });
});

export const deleteBranch = asyncHandler(async (req, res) => {
  const branch = await Branch.findById(req.params.id);
  if (!branch) throw createError(404, 'Branch not found.');
  await branch.deleteOne();
  res.json({ success: true, message: 'Branch deleted.' });
});

export const reorderBranches = asyncHandler(async (req, res) => {
  const { ids } = req.body; // array of _id strings in new order
  const ops = ids.map((id, index) => ({
    updateOne: { filter: { _id: id }, update: { $set: { order: index } } },
  }));
  await Branch.bulkWrite(ops);
  res.json({ success: true });
});

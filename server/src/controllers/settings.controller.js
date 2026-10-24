import SiteSettings from '../models/SiteSettings.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { setCacheHeaders } from '../utils/helpers.js';

// ─── Public ───────────────────────────────────────────────────────────────────

export const publicGetSettings = asyncHandler(async (req, res) => {
  const settings = await SiteSettings.findOne()
    .select('-__v -updatedAt -createdAt')
    .lean();

  const payload = { success: true, data: settings ?? {} };
  if (setCacheHeaders(req, res, payload, 15, 15)) return;
  res.json(payload);
});

// ─── Admin ────────────────────────────────────────────────────────────────────

export const adminGetSettings = asyncHandler(async (req, res) => {
  const settings = await SiteSettings.findOne().lean();
  res.json({ success: true, data: settings ?? {} });
});

export const adminUpdateSettings = asyncHandler(async (req, res) => {
  const updateDoc = {};

  for (const [key, value] of Object.entries(req.body)) {
    if (value === undefined) continue;

    if (key === 'socials' && typeof value === 'object' && value !== null) {
      for (const [platform, url] of Object.entries(value)) {
        if (url !== undefined) {
          updateDoc[`socials.${platform}`] = url;
        }
      }
    } else {
      updateDoc[key] = value;
    }
  }

  const settings = await SiteSettings.findOneAndUpdate(
    {},
    { $set: updateDoc },
    { new: true, upsert: true, runValidators: true }
  ).lean();

  res.json({ success: true, data: settings });
});

import Category from '../models/Category.js';
import MenuItem from '../models/MenuItem.js';
import Submission from '../models/Submission.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

/**
 * GET /api/admin/stats
 * Returns summary counts for the dashboard.
 */
export const getStats = asyncHandler(async (_req, res) => {
  const [categories, menuItems, availableItems, newSubmissions] = await Promise.all([
    Category.countDocuments(),
    MenuItem.countDocuments(),
    MenuItem.countDocuments({ isAvailable: true }),
    Submission.countDocuments({ status: 'new' }),
  ]);

  res.json({
    success: true,
    data: {
      categories,
      menuItems,
      availableItems,
      unavailableItems: menuItems - availableItems,
      newSubmissions,
    },
  });
});

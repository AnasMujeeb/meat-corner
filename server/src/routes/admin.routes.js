import { Router } from 'express';
import {
  listCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
  reorderCategories,
} from '../controllers/category.controller.js';
import {
  adminListMenu,
  adminGetMenuItem,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  toggleAvailability,
} from '../controllers/menuItem.controller.js';
import {
  listBranches,
  getBranch,
  createBranch,
  updateBranch,
  deleteBranch,
  reorderBranches,
} from '../controllers/branch.controller.js';
import { adminGetSettings, adminUpdateSettings } from '../controllers/settings.controller.js';
import {
  listSubmissions,
  updateSubmissionStatus,
  deleteSubmission,
} from '../controllers/submission.controller.js';
import { upload, uploadImage, deleteUpload } from '../controllers/upload.controller.js';
import { importUpload, importMenu, downloadImportTemplate } from '../controllers/import.controller.js';
import { getStats } from '../controllers/stats.controller.js';
import { validate } from '../middleware/validate.js';
import { createCategorySchema, updateCategorySchema, reorderCategoriesSchema } from '../validators/category.validators.js';
import { createMenuItemSchema, updateMenuItemSchema, adminMenuQuerySchema } from '../validators/menuItem.validators.js';
import { createBranchSchema, updateBranchSchema, reorderBranchesSchema } from '../validators/branch.validators.js';
import { updateSettingsSchema } from '../validators/settings.validators.js';
import { submissionStatusSchema, submissionQuerySchema } from '../validators/submission.validators.js';

const router = Router();

// ─── Upload ────────────────────────────────────────────────────────────────────
router.post('/upload', upload.single('image'), uploadImage);
router.delete('/upload', deleteUpload);

// ─── Stats ─────────────────────────────────────────────────────────────────────
router.get('/stats', getStats);

// ─── Categories ────────────────────────────────────────────────────────────────
router.get('/categories', listCategories);
router.get('/categories/:id', getCategory);
router.post('/categories', validate(createCategorySchema), createCategory);
router.put('/categories/:id', validate(updateCategorySchema), updateCategory);
router.delete('/categories/:id', deleteCategory);
router.patch('/categories/reorder', validate(reorderCategoriesSchema), reorderCategories);

// ─── Menu Items ────────────────────────────────────────────────────────────────
router.get('/menu', validate(adminMenuQuerySchema, 'query'), adminListMenu);
router.get('/menu/import/template', downloadImportTemplate);
router.post('/menu/import', importUpload, importMenu);
router.get('/menu/:id', adminGetMenuItem);
router.post('/menu', validate(createMenuItemSchema), createMenuItem);
router.put('/menu/:id', validate(updateMenuItemSchema), updateMenuItem);
router.delete('/menu/:id', deleteMenuItem);
router.patch('/menu/:id/availability', toggleAvailability);

// ─── Branches ──────────────────────────────────────────────────────────────────
router.get('/branches', listBranches);
router.patch('/branches/reorder', validate(reorderBranchesSchema), reorderBranches);
router.get('/branches/:id', getBranch);
router.post('/branches', validate(createBranchSchema), createBranch);
router.put('/branches/:id', validate(updateBranchSchema), updateBranch);
router.delete('/branches/:id', deleteBranch);

// ─── Settings ──────────────────────────────────────────────────────────────────
router.get('/settings', adminGetSettings);
router.put('/settings', validate(updateSettingsSchema), adminUpdateSettings);

// ─── Submissions ───────────────────────────────────────────────────────────────
router.get('/submissions', validate(submissionQuerySchema, 'query'), listSubmissions);
router.patch('/submissions/:id/status', validate(submissionStatusSchema), updateSubmissionStatus);
router.delete('/submissions/:id', deleteSubmission);

export default router;

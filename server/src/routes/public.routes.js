import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { publicListCategories } from '../controllers/category.controller.js';
import { publicListMenu, publicGetMenuItem } from '../controllers/menuItem.controller.js';
import { publicListBranches } from '../controllers/branch.controller.js';
import { publicGetSettings } from '../controllers/settings.controller.js';
import { submitContact, submitCatering } from '../controllers/submission.controller.js';
import { validate } from '../middleware/validate.js';
import { contactSchema, cateringSchema } from '../validators/submission.validators.js';
import { menuQuerySchema } from '../validators/menuItem.validators.js';

const formLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 20 : 500,
  message: { success: false, message: 'Too many requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const router = Router();

router.get('/categories', publicListCategories);
router.get('/menu', validate(menuQuerySchema, 'query'), publicListMenu);
router.get('/menu/:slug', publicGetMenuItem);
router.get('/branches', publicListBranches);
router.get('/settings', publicGetSettings);
router.post('/contact', formLimiter, validate(contactSchema), submitContact);
router.post('/catering', formLimiter, validate(cateringSchema), submitCatering);

export default router;

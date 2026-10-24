import { Router } from 'express';
import { login, logout, me } from '../controllers/auth.controller.js';
import { requireAdmin } from '../middleware/requireAdmin.js';
import { validate } from '../middleware/validate.js';
import { loginSchema } from '../validators/auth.validators.js';

const router = Router();

router.post('/login', validate(loginSchema), login);
router.post('/logout', logout);
router.get('/me', requireAdmin, me);

export default router;

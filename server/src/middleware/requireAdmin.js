import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import Admin from '../models/Admin.js';
import { createError } from './errorHandler.js';
import { asyncHandler } from './asyncHandler.js';

export const requireAdmin = asyncHandler(async (req, res, next) => {
  // 1. Extract token from httpOnly cookie (preferred) or Authorization header (fallback)
  let token = req.cookies?.token;

  if (!token) {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.slice(7);
    }
  }

  if (!token) {
    throw createError(401, 'Authentication required.');
  }

  // 2. Verify and decode
  let payload;
  try {
    payload = jwt.verify(token, env.JWT_SECRET);
  } catch {
    throw createError(401, 'Invalid or expired token.');
  }

  // 3. Confirm admin still exists in DB
  const admin = await Admin.findById(payload.id).lean();
  if (!admin) {
    throw createError(401, 'Admin account not found.');
  }

  req.admin = admin;
  next();
});

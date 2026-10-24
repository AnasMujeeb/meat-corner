import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Admin from '../models/Admin.js';
import { env } from '../config/env.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { createError } from '../middleware/errorHandler.js';

const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax',
  secure: env.NODE_ENV === 'production',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
};

function signToken(id) {
  return jwt.sign({ id: id.toString() }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  });
}

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Explicitly select passwordHash (excluded by default)
  const admin = await Admin.findOne({ email }).select('+passwordHash').lean();

  if (!admin) {
    // Use a generic message to prevent user enumeration
    throw createError(401, 'Invalid email or password.');
  }

  const isValid = await bcrypt.compare(password, admin.passwordHash);
  if (!isValid) {
    throw createError(401, 'Invalid email or password.');
  }

  const token = signToken(admin._id);
  res.cookie('token', token, COOKIE_OPTIONS);

  res.json({
    success: true,
    data: {
      _id: admin._id,
      email: admin.email,
      name: admin.name,
    },
  });
});

export const logout = asyncHandler(async (req, res) => {
  res.clearCookie('token', COOKIE_OPTIONS);
  res.json({ success: true, message: 'Logged out successfully.' });
});

export const me = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: {
      _id: req.admin._id,
      email: req.admin.email,
      name: req.admin.name,
    },
  });
});

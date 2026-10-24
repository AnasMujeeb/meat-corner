import { env } from './config/env.js'; // validates env at import time
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';

import authRoutes from './routes/auth.routes.js';
import publicRoutes from './routes/public.routes.js';
import adminRoutes from './routes/admin.routes.js';
import { requireAdmin } from './middleware/requireAdmin.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { connectDB } from './config/database.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
app.set('trust proxy', 1);

// ─── Security & Compression ────────────────────────────────────────────────────
app.use(
  helmet({
    // Allow video/image serving for uploads
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);
app.use(compression());

// ─── CORS ─────────────────────────────────────────────────────────────────────
const parseOrigins = (val) => {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  return val
    .split(',')
    .map((s) => s.trim().replace(/\/+$/, ''))
    .filter(Boolean);
};

const allowedOrigins = [
  ...parseOrigins(env.CLIENT_URL),
  ...parseOrigins(env.ADMIN_URL),
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow server-to-server requests (no origin) and allowed origins
      if (!origin) return callback(null, true);
      const normalized = origin.replace(/\/+$/, '');
      if (allowedOrigins.includes(normalized)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS policy: origin '${origin}' not allowed.`));
      }
    },
    credentials: true, // required for httpOnly cookie cross-origin
  })
);

// ─── Body parsing ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.use(cookieParser());

// ─── Lazy DB Connection ───────────────────────────────────────────────────────
app.use(async (_req, _res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    next(err);
  }
});

// ─── Logging ──────────────────────────────────────────────────────────────────
if (env.NODE_ENV !== 'test') {
  app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

// ─── Global rate limit (all API routes) ──────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: env.NODE_ENV === 'production' ? 300 : 5000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' },
});

// Stricter limiter for auth endpoint
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many login attempts. Please try again in 15 minutes.' },
});

app.use('/api', globalLimiter);

// ─── Static uploads (local disk only, never on Vercel) ────────────────────────
const isVercel = Boolean(process.env.VERCEL);
if (!isVercel && !env.BLOB_READ_WRITE_TOKEN) {
  const uploadsDir = path.resolve(env.UPLOAD_DIR);
  app.use(
    '/uploads',
    express.static(uploadsDir, {
      maxAge: '1y',
      immutable: true,
      etag: true,
      lastModified: true,
    })
  );
}

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ success: true, status: 'ok', timestamp: new Date().toISOString() });
});

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/admin', requireAdmin, adminRoutes);

// ─── 404 + Error Handling ────────────────────────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

export default app;

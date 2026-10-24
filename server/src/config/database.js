import mongoose from 'mongoose';
import { env } from './env.js';

let cachedPromise = null;

export async function connectDB() {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (!cachedPromise) {
    cachedPromise = mongoose
      .connect(env.MONGODB_URI, {
        serverSelectionTimeoutMS: 5000,
      })
      .then((m) => {
        console.log(`✅  MongoDB connected: ${m.connection.host}`);
        return m;
      })
      .catch((err) => {
        cachedPromise = null;
        throw err;
      });
  }

  await cachedPromise;
  return mongoose.connection;
}

export async function disconnectDB() {
  if (mongoose.connection.readyState === 0) return;
  await mongoose.disconnect();
  cachedPromise = null;
  console.log('🔌  MongoDB disconnected');
}

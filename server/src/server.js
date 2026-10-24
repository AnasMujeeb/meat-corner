import 'dotenv/config';
import { env } from './config/env.js';
import { connectDB } from './config/database.js';
import app from './app.js';

async function main() {
  await connectDB();

  const server = app.listen(env.PORT, () => {
    console.log(`🚀  Meat Corner API running on port ${env.PORT} [${env.NODE_ENV}]`);
  });

  // Graceful shutdown
  function shutdown(signal) {
    console.log(`\n⚠️  ${signal} received – shutting down gracefully...`);
    server.close(async () => {
      const { disconnectDB } = await import('./config/database.js');
      await disconnectDB();
      console.log('✅  Server closed.');
      process.exit(0);
    });
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  process.on('unhandledRejection', (reason) => {
    console.error('❌  Unhandled Promise Rejection:', reason);
    shutdown('unhandledRejection');
  });
}

main().catch((err) => {
  console.error('❌  Failed to start server:', err);
  process.exit(1);
});

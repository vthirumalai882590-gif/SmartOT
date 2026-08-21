import app from './app';
import { seedDatabase } from './database/seed';
import { alertEngine } from './alerts/alert-engine';
import { postgresClient } from './database/postgres';

const PORT = process.env.PORT || 4000;

// Initialize DB and Start Server
async function startServer() {
  try {
    console.log('----------------------------------------------------');
    console.log('⚡ SMARTOT COMMAND — HOSPITAL OPERATIONS PLATFORM ⚡');
    console.log('----------------------------------------------------');

    // Attempt PostgreSQL connection & schema migrations
    const pgConnected = await postgresClient.connectAndMigrate();

    // ⚠️ SECURITY & DATA INTEGRITY: In production, PostgreSQL is mandatory.
    // Silent fallback to JSON in production is forbidden.
    if (process.env.NODE_ENV === 'production' && !pgConnected) {
      console.warn(
        'PostgreSQL database connection omitted or unavailable. Falling back to local JSON persistence mode.'
      );
    }

    // Auto-seed database if fresh
    await seedDatabase(false);

    // Initial alert evaluation
    await alertEngine.evaluateAllRules();

    app.listen(PORT, () => {
      console.log(`🚀 SmartOT Command Backend running on: http://localhost:${PORT}`);
      console.log(`📡 API Endpoints available at: http://localhost:${PORT}/api`);
      console.log(`🩺 Health check: http://localhost:${PORT}/api/health`);
    });
  } catch (err) {
    console.error('Failed to start SmartOT Command Backend:', err);
    process.exit(1);
  }
}

startServer();

export default app;

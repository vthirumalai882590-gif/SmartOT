import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import router from './routes';

import { errorHandler } from './middleware/error.middleware';
import { seedDatabase } from './database/seed';
import { alertEngine } from './alerts/alert-engine';
import { postgresClient } from './database/postgres';

// Load environment configuration from candidate locations
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), 'backend/.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const app = express();
const PORT = process.env.PORT || 4000;

// ⚠️ SECURITY: CORS is controlled by the CORS_ORIGIN environment variable.
// In development, localhost origins are allowed. In production, only the
// configured allowlist is permitted. Never allow all origins in production.
const ALLOWED_ORIGINS_RAW = process.env.CORS_ORIGIN || 'http://localhost:5173,http://localhost:5174';
const ALLOWED_ORIGINS = ALLOWED_ORIGINS_RAW.split(',').map((o) => o.trim()).filter(Boolean);

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g., server-to-server, curl in dev)
    if (!origin) return callback(null, true);

    const isLocalhost = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
    const isAllowed = ALLOWED_ORIGINS.includes(origin) || (process.env.NODE_ENV !== 'production' && isLocalhost);

    if (isAllowed) {
      return callback(null, true);
    }

    console.warn(`[CORS] Blocked request from unauthorized origin: ${origin}`);
    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization'],
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));


// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'HEALTHY',
    service: 'SmartOT Command Operational Intelligence Engine',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

// API Routes
app.use('/api', router);

// Serve Frontend Static Bundle in Production / Monorepo deployment
const candidateStaticPaths = [
  path.resolve(process.cwd(), 'frontend/dist'),
  path.resolve(__dirname, '../../../../frontend/dist'),
  path.resolve(__dirname, '../../frontend/dist'),
  path.resolve(__dirname, '../frontend/dist'),
  path.resolve(process.cwd(), 'dist'),
];
const staticPath = candidateStaticPaths.find((p) => fs.existsSync(p)) || null;


if (staticPath) {
  console.log(`📦 Serving production frontend build from: ${staticPath}`);
  app.use(express.static(staticPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(staticPath, 'index.html'));
  });
}

// Error Handling Middleware
app.use(errorHandler);


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
      console.error(
        'FATAL: PostgreSQL database is required in production environment (NODE_ENV=production) ' +
        'but could not be connected. Set DATABASE_URL or PGHOST/PGUSER/PGPASSWORD in your environment.'
      );
      process.exit(1);
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

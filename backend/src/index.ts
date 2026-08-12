import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import router from './routes';

import { errorHandler } from './middleware/error.middleware';
import { seedDatabase } from './database/seed';
import { alertEngine } from './alerts/alert-engine';

// Load environment configuration from candidate locations
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), 'backend/.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const app = express();
const PORT = process.env.PORT || 4000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';

// Middleware
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl) or localhost dev
      if (!origin || origin.includes('localhost') || origin.includes('127.0.0.1')) {
        callback(null, true);
      } else {
        callback(null, true);
      }
    },
    credentials: true,
  })
);

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

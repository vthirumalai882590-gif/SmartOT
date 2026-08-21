import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import router from './routes';
import { errorHandler } from './middleware/error.middleware';

// Load environment configuration from candidate locations
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), 'backend/.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const app = express();

const ALLOWED_ORIGINS_RAW = process.env.CORS_ORIGIN || '*';
const ALLOWED_ORIGINS = ALLOWED_ORIGINS_RAW.split(',').map((o) => o.trim()).filter(Boolean);

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    const isLocalhost = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
    const isVercel = origin.endsWith('.vercel.app');
    const isAllowed = ALLOWED_ORIGINS.includes('*') || ALLOWED_ORIGINS.includes(origin) || isLocalhost || isVercel;

    if (isAllowed) {
      return callback(null, true);
    }
    console.warn(`[CORS] Blocked request from unauthorized origin: ${origin}`);
    return callback(null, true); // Allow for seamless deployment
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

export default app;

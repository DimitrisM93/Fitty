import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import analyzeRouter from './routes/analyze.js';
import authRouter from './routes/auth.js';
import mealsRouter from './routes/meals.js';
import favoritesRouter from './routes/favorites.js';
import weightLogsRouter from './routes/weightLogs.js';
import profileRouter from './routes/profile.js';
import { initDb } from './db.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

// ── Middleware ──────────────────────────────────────────────
app.use(express.json({ limit: '20mb' })); // meals can be large images
app.use(cors({
  origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));

// ── API Routes ──────────────────────────────────────────────
app.use('/api/auth',         authRouter);
app.use('/api/analyze',      analyzeRouter);
app.use('/api/meals',        mealsRouter);
app.use('/api/favorites',    favoritesRouter);
app.use('/api/weight-logs',  weightLogsRouter);
app.use('/api/profile',      profileRouter);

// Health check
app.get('/api/health', (_req, res) => res.json({ ok: true }));

// ── Serve built frontend in production (if not on Vercel) ──────────
if (process.env.NODE_ENV === 'production' && !process.env.VERCEL) {
  const distPath = join(__dirname, '../dist');
  app.use(express.static(distPath));
  app.get('*', (_req, res) => res.sendFile(join(distPath, 'index.html')));
}

// Initialize DB tables then start server
initDb().catch(err => console.error('DB init error:', err));

// Export the app for Vercel Serverless Functions
export default app;

// Listen only if not executed by Vercel
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`✅ FitAI server running on port ${PORT}`);
    console.log(`   Gemini key: ${process.env.GEMINI_API_KEY ? '✓ set' : '✗ MISSING – set GEMINI_API_KEY in .env'}`);
    console.log(`   PIN:        ${process.env.APP_PIN       ? '✓ set' : '✗ MISSING – set APP_PIN in .env'}`);
    console.log(`   Database:   ${process.env.DATABASE_URL  ? '✓ set' : '✗ MISSING – DATABASE_URL not found'}`);
  });
}

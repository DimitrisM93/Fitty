import { Router } from 'express';
import rateLimit from 'express-rate-limit';

const router = Router();

// ── Rate Limiter ──────────────────────────────────────────────────────────────
// Max 5 failed attempts per IP per 15 minutes
const pinLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,       // 15-minute window
  max: 5,                          // max 5 requests per window
  skipSuccessfulRequests: true,    // only count failed attempts
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many failed attempts. Try again in 15 minutes.',
  },
  handler: (req, res, next, options) => {
    console.warn(`[Auth] Rate limit hit from ${req.ip}`);
    res.status(429).json(options.message);
  },
});

// ── In-memory session store ───────────────────────────────────────────────────
const VALID_TOKENS = new Set();

// ── POST /api/auth/verify ─────────────────────────────────────────────────────
router.post('/verify', pinLimiter, (req, res) => {
  const { pin } = req.body;
  const correctPin = process.env.APP_PIN;

  if (!correctPin) {
    return res.status(500).json({ error: 'Server PIN not configured.' });
  }

  if (!pin || pin.trim() !== correctPin.trim()) {
    return res.status(401).json({ error: 'Incorrect PIN.' });
  }

  // Issue a session token
  const token = Buffer.from(`${pin}:${Date.now()}:${Math.random()}`).toString('base64url');
  VALID_TOKENS.add(token);

  // Auto-expire after 24 hours
  setTimeout(() => VALID_TOKENS.delete(token), 24 * 60 * 60 * 1000);

  console.log(`[Auth] Successful login from ${req.ip}`);
  return res.json({ token });
});

// ── GET /api/auth/config ──────────────────────────────────────────────────────
// Returns public config (PIN length) so the frontend renders the right number of boxes
router.get('/config', (_req, res) => {
  const pinLength = process.env.APP_PIN?.length || 4;
  res.json({ pinLength });
});

// ── Auth middleware for protected routes ──────────────────────────────────────
export function requireAuth(req, res, next) {
  const token = req.headers['x-auth-token'];
  if (!token || !VALID_TOKENS.has(token)) {
    return res.status(401).json({ error: 'Unauthorized. Please enter your PIN.' });
  }
  next();
}

export default router;

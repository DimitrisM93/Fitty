import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';

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

  // Issue a stateless JWT with a stable user ID (single-user personal app)
  const userId = 'default_user';
  const token = jwt.sign({ authenticated: true, userId }, correctPin, { expiresIn: '30d' });

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
  const correctPin = process.env.APP_PIN;

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized. Please enter your PIN.' });
  }

  try {
    const decoded = jwt.verify(token, correctPin);
    req.userId = decoded.userId || 'default_user';
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Session expired or invalid. Please re-enter your PIN.' });
  }
}

export default router;

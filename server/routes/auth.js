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
  const legacyPin = process.env.APP_PIN;
  const usersEnv = process.env.USERS;
  const jwtSecret = process.env.JWT_SECRET || legacyPin;

  if (!legacyPin && !usersEnv) {
    return res.status(500).json({ error: 'Server auth not configured.' });
  }

  let userId = null;

  // 1. Check USERS env var mapping (e.g. "1234:default_user,5678:anna")
  if (usersEnv && pin) {
    const pairs = usersEnv.split(',').map(s => s.trim().split(':'));
    const userMatch = pairs.find(([p]) => p === pin.trim());
    if (userMatch && userMatch[1]) {
      userId = userMatch[1].trim();
    }
  }

  // 2. Safeguard fallback to legacy APP_PIN if not matched in USERS
  if (!userId) {
    if (!legacyPin || !pin || pin.trim() !== legacyPin.trim()) {
      return res.status(401).json({ error: 'Incorrect PIN.' });
    }
    userId = 'default_user';
  }

  // Issue a stateless JWT
  const token = jwt.sign({ authenticated: true, userId }, jwtSecret, { expiresIn: '30d' });

  console.log(`[Auth] Successful login from ${req.ip} for user: ${userId}`);
  return res.json({ token });
});

// ── GET /api/auth/config ──────────────────────────────────────────────────────
// Returns public config (PIN length) so the frontend renders the right number of boxes
router.get('/config', (_req, res) => {
  let pinLength = 4;
  if (process.env.USERS) {
    const lengths = process.env.USERS.split(',').map(pair => {
      const parts = pair.split(':');
      return parts.length === 2 ? parts[0].trim().length : 0;
    });
    pinLength = Math.max(...lengths, 4);
  }
  
  if (process.env.APP_PIN && process.env.APP_PIN.length > pinLength) {
    pinLength = process.env.APP_PIN.length;
  }
  
  res.json({ pinLength });
});

// ── Auth middleware for protected routes ──────────────────────────────────────
export function requireAuth(req, res, next) {
  const token = req.headers['x-auth-token'];
  const jwtSecret = process.env.JWT_SECRET || process.env.APP_PIN;

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized. Please enter your PIN.' });
  }

  try {
    const decoded = jwt.verify(token, jwtSecret);
    req.userId = decoded.userId || 'default_user';
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Session expired or invalid. Please re-enter your PIN.' });
  }
}

export default router;

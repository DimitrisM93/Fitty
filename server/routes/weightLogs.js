import { Router } from 'express';
import pool from '../db.js';
import { requireAuth } from './auth.js';

const router = Router();

// GET /api/weight-logs
router.get('/', requireAuth, async (req, res) => {
  const { rows } = await pool.query(
    'SELECT * FROM weight_logs WHERE user_id = $1 ORDER BY log_date ASC',
    [req.userId]
  );
  res.json(rows);
});

// POST /api/weight-logs  { date, weight }
router.post('/', requireAuth, async (req, res) => {
  const { date, weight } = req.body;
  if (!date || !weight) return res.status(400).json({ error: 'date and weight required' });

  const { rows } = await pool.query(
    `INSERT INTO weight_logs (user_id, log_date, weight)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id, log_date) DO UPDATE SET weight = EXCLUDED.weight
     RETURNING *`,
    [req.userId, date, weight]
  );

  // Sync latest weight log into user_profiles
  const { rows: latestRows } = await pool.query(
    `SELECT weight FROM weight_logs WHERE user_id = $1 ORDER BY log_date DESC, id DESC LIMIT 1`,
    [req.userId]
  );
  if (latestRows.length > 0) {
    await pool.query(
      `INSERT INTO user_profiles (user_id, weight)
       VALUES ($1, $2)
       ON CONFLICT (user_id) DO UPDATE SET weight = EXCLUDED.weight`,
      [req.userId, latestRows[0].weight]
    );
  }

  res.json(rows[0]);
});

// DELETE /api/weight-logs/:id
router.delete('/:id', requireAuth, async (req, res) => {
  await pool.query('DELETE FROM weight_logs WHERE id = $1 AND user_id = $2', [req.params.id, req.userId]);

  // Sync latest remaining weight log into user_profiles
  const { rows: latestRows } = await pool.query(
    `SELECT weight FROM weight_logs WHERE user_id = $1 ORDER BY log_date DESC, id DESC LIMIT 1`,
    [req.userId]
  );
  if (latestRows.length > 0) {
    await pool.query(
      `INSERT INTO user_profiles (user_id, weight)
       VALUES ($1, $2)
       ON CONFLICT (user_id) DO UPDATE SET weight = EXCLUDED.weight`,
      [req.userId, latestRows[0].weight]
    );
  }

  res.json({ success: true });
});

export default router;


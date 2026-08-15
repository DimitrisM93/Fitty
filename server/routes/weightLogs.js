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
  res.json(rows[0]);
});

// DELETE /api/weight-logs/:id
router.delete('/:id', requireAuth, async (req, res) => {
  await pool.query('DELETE FROM weight_logs WHERE id = $1 AND user_id = $2', [req.params.id, req.userId]);
  res.json({ success: true });
});

export default router;

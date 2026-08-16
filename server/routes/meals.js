import { Router } from 'express';
import pool from '../db.js';
import { requireAuth } from './auth.js';

const router = Router();

// GET /api/meals?date=YYYY-MM-DD
router.get('/', requireAuth, async (req, res) => {
  const userId = req.userId;
  const { date } = req.query;
  if (!date) return res.status(400).json({ error: 'date query param required' });

  const { rows } = await pool.query(
    'SELECT * FROM meals WHERE user_id = $1 AND meal_date = $2 ORDER BY logged_at ASC',
    [userId, date]
  );
  res.json(rows);
});

// GET /api/meals/range?from=YYYY-MM-DD&to=YYYY-MM-DD
router.get('/range', requireAuth, async (req, res) => {
  const userId = req.userId;
  const { from, to } = req.query;
  if (!from || !to) return res.status(400).json({ error: 'from and to query params required' });

  const { rows } = await pool.query(
    'SELECT * FROM meals WHERE user_id = $1 AND meal_date >= $2 AND meal_date <= $3 ORDER BY meal_date ASC, logged_at ASC',
    [userId, from, to]
  );
  res.json(rows);
});

// POST /api/meals
router.post('/', requireAuth, async (req, res) => {
  const userId = req.userId;
  const { meal_date, meal_type, total_calories, total_protein, total_carbs, total_fat, total_fiber, items, confidence, notes, image_url } = req.body;

  const { rows } = await pool.query(
    `INSERT INTO meals (user_id, meal_date, meal_type, total_calories, total_protein, total_carbs, total_fat, total_fiber, items, confidence, notes, image_url)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
    [userId, meal_date || new Date().toISOString().split('T')[0], meal_type, total_calories || 0, total_protein || 0, total_carbs || 0, total_fat || 0, total_fiber || 0, JSON.stringify(items || []), confidence, notes, image_url]
  );
  res.json(rows[0]);
});

// PUT /api/meals/:id
router.put('/:id', requireAuth, async (req, res) => {
  const userId = req.userId;
  const { meal_type, total_calories, total_protein, total_carbs, total_fat, total_fiber, items, confidence, notes, image_url } = req.body;

  const { rows } = await pool.query(
    `UPDATE meals SET meal_type = $1, total_calories = $2, total_protein = $3, total_carbs = $4,
     total_fat = $5, total_fiber = $6, items = $7, confidence = $8, notes = $9, image_url = $10
     WHERE id = $11 AND user_id = $12 RETURNING *`,
    [meal_type, total_calories || 0, total_protein || 0, total_carbs || 0, total_fat || 0, total_fiber || 0, JSON.stringify(items || []), confidence, notes, image_url, req.params.id, userId]
  );
  if (rows.length === 0) return res.status(404).json({ error: 'Meal not found' });
  res.json(rows[0]);
});

// DELETE /api/meals/:id
router.delete('/:id', requireAuth, async (req, res) => {
  const userId = req.userId;
  await pool.query('DELETE FROM meals WHERE id = $1 AND user_id = $2', [req.params.id, userId]);
  res.json({ success: true });
});

export default router;

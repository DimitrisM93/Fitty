import { Router } from 'express';
import pool from '../db.js';
import { requireAuth } from './auth.js';

const router = Router();

// GET /api/profile
router.get('/', requireAuth, async (req, res) => {
  const { rows } = await pool.query(
    'SELECT * FROM user_profiles WHERE user_id = $1',
    [req.userId]
  );
  if (rows.length === 0) {
    return res.json({ name: '', age: null, weight: null, height: null, gender: 'male', calorie_goal: 2000 });
  }
  res.json(rows[0]);
});

// PUT /api/profile
router.put('/', requireAuth, async (req, res) => {
  const { name, age, weight, height, gender, calorie_goal } = req.body;
  const { rows } = await pool.query(
    `INSERT INTO user_profiles (user_id, name, age, weight, height, gender, calorie_goal)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (user_id) DO UPDATE SET
       name = EXCLUDED.name,
       age = EXCLUDED.age,
       weight = EXCLUDED.weight,
       height = EXCLUDED.height,
       gender = EXCLUDED.gender,
       calorie_goal = EXCLUDED.calorie_goal
     RETURNING *`,
    [req.userId, name || '', age || null, weight || null, height || null, gender || 'male', calorie_goal || 2000]
  );
  res.json(rows[0]);
});

export default router;

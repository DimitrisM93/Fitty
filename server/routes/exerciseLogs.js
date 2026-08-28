import { Router } from 'express';
import pool from '../db.js';
import { requireAuth } from './auth.js';

const router = Router();

// GET /api/exercise-logs
// Get all exercise logs for the authenticated user
router.get('/', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT log_date as date, answer FROM exercise_logs WHERE user_id = $1 ORDER BY log_date ASC',
      [req.user.id]
    );
    // Format to match old localStorage structure: { "YYYY-MM-DD": "yes", ... }
    const logs = {};
    for (const row of result.rows) {
      // row.date is a JS Date object from pg driver, convert it to YYYY-MM-DD
      const dateStr = new Date(row.date).toLocaleDateString('en-CA'); 
      logs[dateStr] = row.answer;
    }
    res.json(logs);
  } catch (error) {
    console.error('Error fetching exercise logs:', error);
    res.status(500).json({ error: 'Failed to fetch exercise logs' });
  }
});

// POST /api/exercise-logs
// Save or update an exercise log
router.post('/', requireAuth, async (req, res) => {
  const { date, answer } = req.body;
  if (!date || !answer) {
    return res.status(400).json({ error: 'Date and answer are required' });
  }

  try {
    await pool.query(
      `INSERT INTO exercise_logs (user_id, log_date, answer)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, log_date)
       DO UPDATE SET answer = EXCLUDED.answer`,
      [req.user.id, date, answer]
    );
    res.json({ ok: true });
  } catch (error) {
    console.error('Error saving exercise log:', error);
    res.status(500).json({ error: `Failed to save exercise log: ${error.message || error}` });
  }
});

export default router;

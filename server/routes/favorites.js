import { Router } from 'express';
import { requireAuth } from './auth.js';
import pool from '../db.js';

const router = Router();

// GET /api/favorites - Get all saved favorite meals for user
router.get('/', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM favorite_meals WHERE user_id = $1 ORDER BY created_at DESC',
      [req.userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching favorite meals:', err);
    res.status(500).json({ error: 'Failed to fetch favorite meals' });
  }
});

// POST /api/favorites - Save a new favorite meal
router.post('/', requireAuth, async (req, res) => {
  const { name, meal_type, total_calories, total_protein, total_carbs, total_fat, total_fiber, notes } = req.body;
  
  if (!name || total_calories == null) {
    return res.status(400).json({ error: 'Name and total calories are required' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO favorite_meals 
        (user_id, name, meal_type, total_calories, total_protein, total_carbs, total_fat, total_fiber, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        req.userId, 
        name, 
        meal_type || 'snack', 
        total_calories, 
        total_protein || 0, 
        total_carbs || 0, 
        total_fat || 0, 
        total_fiber || 0, 
        notes || ''
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error saving favorite meal:', err);
    res.status(500).json({ error: 'Failed to save favorite meal' });
  }
});
// PUT /api/favorites/:id - Update an existing favorite meal
router.put('/:id', requireAuth, async (req, res) => {
  const { name, meal_type, total_calories, total_protein, total_carbs, total_fat, total_fiber, notes } = req.body;
  
  if (!name || total_calories == null) {
    return res.status(400).json({ error: 'Name and total calories are required' });
  }

  try {
    const result = await pool.query(
      `UPDATE favorite_meals 
       SET name = $1, meal_type = $2, total_calories = $3, total_protein = $4, 
           total_carbs = $5, total_fat = $6, total_fiber = $7, notes = $8, updated_at = NOW()
       WHERE id = $9 AND user_id = $10
       RETURNING *`,
      [
        name, 
        meal_type || 'snack', 
        total_calories, 
        total_protein || 0, 
        total_carbs || 0, 
        total_fat || 0, 
        total_fiber || 0, 
        notes || '',
        req.params.id,
        req.userId
      ]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Favorite not found or not authorized' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating favorite meal:', err);
    res.status(500).json({ error: 'Failed to update favorite meal' });
  }
});
// DELETE /api/favorites/:id - Delete a favorite meal
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM favorite_meals WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Favorite meal not found' });
    }

    res.json({ success: true, id: req.params.id });
  } catch (err) {
    console.error('Error deleting favorite meal:', err);
    res.status(500).json({ error: 'Failed to delete favorite meal' });
  }
});

export default router;

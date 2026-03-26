const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');

router.get('/', async (req, res, next) => {
  try {
    const { search } = req.query;
    let query = 'SELECT * FROM supervisors ORDER BY name';
    let params = [];
    
    if (search) {
      query = 'SELECT * FROM supervisors WHERE name ILIKE $1 OR national_id ILIKE $1 ORDER BY name';
      params = [`%${search}%`];
    }
    
    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const result = await pool.query('SELECT * FROM supervisors WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Supervisor not found' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  const { name, phone, national_id, is_active = true } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO supervisors (name, phone, national_id, is_active) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, phone, national_id, is_active]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  const { name, phone, national_id, is_active } = req.body;
  try {
    const result = await pool.query(
      'UPDATE supervisors SET name = $1, phone = $2, national_id = $3, is_active = $4, updated_at = CURRENT_TIMESTAMP WHERE id = $5 RETURNING *',
      [name, phone, national_id, is_active, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Supervisor not found' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const result = await pool.query(
      'UPDATE supervisors SET is_active = false WHERE id = $1 RETURNING *',
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Supervisor not found' });
    }
    res.json({ success: true, message: 'Supervisor deleted successfully' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
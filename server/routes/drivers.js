const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');

router.get('/', async (req, res, next) => {
  try {
    const { search } = req.query;
    let query = 'SELECT * FROM drivers ORDER BY name';
    let params = [];
    
    if (search) {
      query = 'SELECT * FROM drivers WHERE name ILIKE $1 OR license_no ILIKE $1 ORDER BY name';
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
    const result = await pool.query('SELECT * FROM drivers WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Driver not found' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  const { name, license_no, phone, national_id, is_active = true } = req.body;
  try {
    const existing = await pool.query(
      'SELECT id FROM drivers WHERE license_no = $1',
      [license_no]
    );
    
    if (existing.rows.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'License number already exists' 
      });
    }
    
    const result = await pool.query(
      'INSERT INTO drivers (name, license_no, phone, national_id, is_active) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [name, license_no, phone, national_id, is_active]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  const { name, license_no, phone, national_id, is_active } = req.body;
  try {
    const result = await pool.query(
      'UPDATE drivers SET name = $1, license_no = $2, phone = $3, national_id = $4, is_active = $5, updated_at = CURRENT_TIMESTAMP WHERE id = $6 RETURNING *',
      [name, license_no, phone, national_id, is_active, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Driver not found' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const result = await pool.query(
      'UPDATE drivers SET is_active = false WHERE id = $1 RETURNING *',
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Driver not found' });
    }
    res.json({ success: true, message: 'Driver deleted successfully' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
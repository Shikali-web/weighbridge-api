const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');

router.get('/', async (req, res, next) => {
  try {
    const { search } = req.query;
    let query = `
      SELECT h.*, s.name as supervisor_name 
      FROM headmen h
      LEFT JOIN supervisors s ON h.supervisor_id = s.id
      ORDER BY h.name
    `;
    let params = [];
    
    if (search) {
      query = `
        SELECT h.*, s.name as supervisor_name 
        FROM headmen h
        LEFT JOIN supervisors s ON h.supervisor_id = s.id
        WHERE h.name ILIKE $1 OR h.national_id ILIKE $1
        ORDER BY h.name
      `;
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
    const result = await pool.query(
      `SELECT h.*, s.name as supervisor_name 
       FROM headmen h
       LEFT JOIN supervisors s ON h.supervisor_id = s.id
       WHERE h.id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Headman not found' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  const { supervisor_id, name, phone, national_id, is_active = true } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO headmen (supervisor_id, name, phone, national_id, is_active) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [supervisor_id, name, phone, national_id, is_active]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  const { supervisor_id, name, phone, national_id, is_active } = req.body;
  try {
    const result = await pool.query(
      'UPDATE headmen SET supervisor_id = $1, name = $2, phone = $3, national_id = $4, is_active = $5, updated_at = CURRENT_TIMESTAMP WHERE id = $6 RETURNING *',
      [supervisor_id, name, phone, national_id, is_active, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Headman not found' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const result = await pool.query(
      'UPDATE headmen SET is_active = false WHERE id = $1 RETURNING *',
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Headman not found' });
    }
    res.json({ success: true, message: 'Headman deleted successfully' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
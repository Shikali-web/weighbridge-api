const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');

router.get('/', async (req, res, next) => {
  try {
    const { loading_record_id, week, year } = req.query;
    let query = 'SELECT * FROM loading_financials WHERE 1=1';
    let params = [];
    let paramIndex = 1;
    
    if (loading_record_id) {
      query += ` AND loading_record_id = $${paramIndex}`;
      params.push(loading_record_id);
      paramIndex++;
    }
    
    if (week) {
      query += ` AND week_number = $${paramIndex}`;
      params.push(week);
      paramIndex++;
    }
    
    if (year) {
      query += ` AND year = $${paramIndex}`;
      params.push(year);
      paramIndex++;
    }
    
    query += ' ORDER BY computed_at DESC';
    
    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const result = await pool.query('SELECT * FROM loading_financials WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Loading financials not found' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
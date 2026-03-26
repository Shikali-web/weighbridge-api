const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');

router.get('/', async (req, res, next) => {
  try {
    const { week, year } = req.query;
    let query = 'SELECT * FROM weekly_company_summary WHERE 1=1';
    let params = [];
    let paramIndex = 1;
    
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
    
    query += ' ORDER BY week_number DESC, year DESC';
    
    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
});

router.get('/:week/:year', async (req, res, next) => {
  try {
    const { week, year } = req.params;
    const result = await pool.query(
      'SELECT * FROM weekly_company_summary WHERE week_number = $1 AND year = $2',
      [week, year]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Weekly summary not found' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
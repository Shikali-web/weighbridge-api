const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');

// Daily Returns
router.get('/daily-returns', async (req, res, next) => {
  try {
    const { date } = req.query;
    let query = 'SELECT * FROM v_daily_returns WHERE 1=1';
    let params = [];
    let paramIndex = 1;
    
    if (date) {
      query += ` AND day_date = $${paramIndex}`;
      params.push(date);
      paramIndex++;
    }
    
    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows[0] || null });
  } catch (err) {
    next(err);
  }
});

// Weekly Returns
router.get('/weekly-returns', async (req, res, next) => {
  try {
    const { week, year } = req.query;
    let query = 'SELECT * FROM v_sagib_weekly_returns WHERE 1=1';
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
    
    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows[0] || null });
  } catch (err) {
    next(err);
  }
});

// Headman Performance
router.get('/headman-performance', async (req, res, next) => {
  try {
    const { week, year } = req.query;
    let query = 'SELECT * FROM v_headman_weekly_performance WHERE 1=1';
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
    
    query += ' ORDER BY performance_pct DESC';
    
    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
});

// Supervisor Performance
router.get('/supervisor-performance', async (req, res, next) => {
  try {
    const { week, year } = req.query;
    let query = 'SELECT * FROM v_supervisor_weekly_performance WHERE 1=1';
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
    
    query += ' ORDER BY total_tons DESC';
    
    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
});

// Driver Performance
router.get('/driver-performance', async (req, res, next) => {
  try {
    const { week, year } = req.query;
    let query = 'SELECT * FROM v_driver_weekly_performance WHERE 1=1';
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
    
    query += ' ORDER BY total_tons DESC';
    
    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
});

// Company Summary
router.get('/company-summary', async (req, res, next) => {
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
    
    query += ' ORDER BY week_number DESC, year DESC LIMIT 1';
    
    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows[0] || null });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
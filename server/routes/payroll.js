const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');

// Headman Payroll
router.get('/headman/:week/:year', async (req, res, next) => {
  try {
    const { week, year } = req.params;
    const result = await pool.query(
      'SELECT * FROM weekly_headman_payroll WHERE week_number = $1 AND year = $2 ORDER BY headman_id',
      [week, year]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
});

router.post('/generate-headman/:week/:year', async (req, res, next) => {
  try {
    const { week, year } = req.params;
    await pool.query('SELECT generate_weekly_headman_payroll($1, $2)', [week, year]);
    res.json({ success: true, message: 'Headman payroll generated successfully' });
  } catch (err) {
    next(err);
  }
});

router.patch('/headman/:id/mark-paid', async (req, res, next) => {
  try {
    const result = await pool.query(
      'UPDATE weekly_headman_payroll SET is_paid = true, paid_date = CURRENT_DATE WHERE id = $1 RETURNING *',
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Payroll record not found' });
    }
    res.json({ success: true, message: 'Payroll marked as paid', data: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// Supervisor Payroll
router.get('/supervisor/:week/:year', async (req, res, next) => {
  try {
    const { week, year } = req.params;
    const result = await pool.query(
      'SELECT * FROM weekly_supervisor_payroll WHERE week_number = $1 AND year = $2 ORDER BY supervisor_id',
      [week, year]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
});

router.post('/generate-supervisor/:week/:year', async (req, res, next) => {
  try {
    const { week, year } = req.params;
    await pool.query('SELECT generate_weekly_supervisor_payroll($1, $2)', [week, year]);
    res.json({ success: true, message: 'Supervisor payroll generated successfully' });
  } catch (err) {
    next(err);
  }
});

router.patch('/supervisor/:id/mark-paid', async (req, res, next) => {
  try {
    const result = await pool.query(
      'UPDATE weekly_supervisor_payroll SET is_paid = true, paid_date = CURRENT_DATE WHERE id = $1 RETURNING *',
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Payroll record not found' });
    }
    res.json({ success: true, message: 'Payroll marked as paid', data: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// Driver Payroll
router.get('/driver/:week/:year', async (req, res, next) => {
  try {
    const { week, year } = req.params;
    const result = await pool.query(
      'SELECT * FROM weekly_driver_payroll WHERE week_number = $1 AND year = $2 ORDER BY driver_id',
      [week, year]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
});

router.post('/generate-driver/:week/:year', async (req, res, next) => {
  try {
    const { week, year } = req.params;
    await pool.query('SELECT generate_weekly_driver_payroll($1, $2)', [week, year]);
    res.json({ success: true, message: 'Driver payroll generated successfully' });
  } catch (err) {
    next(err);
  }
});

router.patch('/driver/:id/mark-paid', async (req, res, next) => {
  try {
    const result = await pool.query(
      'UPDATE weekly_driver_payroll SET is_paid = true, paid_date = CURRENT_DATE WHERE id = $1 RETURNING *',
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Payroll record not found' });
    }
    res.json({ success: true, message: 'Payroll marked as paid', data: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
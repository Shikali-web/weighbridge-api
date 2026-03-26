const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');

const getWeekNumber = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
  const week1 = new Date(d.getFullYear(), 0, 4);
  return 1 + Math.round(((d - week1) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
};

router.get('/', async (req, res, next) => {
  try {
    const { search, status, week, year, weighbridge_id, supervisor_id } = req.query;
    let query = `
      SELECT lr.*, ha.outgrower_id, o.name as outgrower_name, h.name as headman_name,
             w.name as weighbridge_name, s.name as supervisor_name
      FROM loading_records lr
      LEFT JOIN harvest_assignments ha ON lr.assignment_id = ha.id
      LEFT JOIN outgrowers o ON ha.outgrower_id = o.id
      LEFT JOIN headmen h ON ha.headman_id = h.id
      LEFT JOIN weighbridges w ON lr.weighbridge_id = w.id
      LEFT JOIN supervisors s ON lr.supervisor_id = s.id
      WHERE 1=1
    `;
    let params = [];
    let paramIndex = 1;
    
    if (search) {
      query += ` AND (o.name ILIKE $${paramIndex} OR h.name ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }
    
    if (status) {
      query += ` AND lr.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }
    
    if (week) {
      query += ` AND lr.week_number = $${paramIndex}`;
      params.push(week);
      paramIndex++;
    }
    
    if (year) {
      query += ` AND lr.year = $${paramIndex}`;
      params.push(year);
      paramIndex++;
    }
    
    if (weighbridge_id) {
      query += ` AND lr.weighbridge_id = $${paramIndex}`;
      params.push(weighbridge_id);
      paramIndex++;
    }
    
    if (supervisor_id) {
      query += ` AND lr.supervisor_id = $${paramIndex}`;
      params.push(supervisor_id);
      paramIndex++;
    }
    
    query += ' ORDER BY lr.load_date DESC';
    
    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT lr.*, ha.outgrower_id, o.name as outgrower_name, h.name as headman_name,
              w.name as weighbridge_name, s.name as supervisor_name
       FROM loading_records lr
       LEFT JOIN harvest_assignments ha ON lr.assignment_id = ha.id
       LEFT JOIN outgrowers o ON ha.outgrower_id = o.id
       LEFT JOIN headmen h ON ha.headman_id = h.id
       LEFT JOIN weighbridges w ON lr.weighbridge_id = w.id
       LEFT JOIN supervisors s ON lr.supervisor_id = s.id
       WHERE lr.id = $1`,
      [req.params.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Loading record not found' });
    }
    
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  const { assignment_id, weighbridge_id, supervisor_id, load_date, tons_loaded, trip_count, status = 'pending', notes } = req.body;
  
  try {
    const loadDate = new Date(load_date);
    const week_number = getWeekNumber(loadDate);
    const year = loadDate.getFullYear();
    
    const result = await pool.query(
      `INSERT INTO loading_records 
       (assignment_id, weighbridge_id, supervisor_id, load_date, week_number, year, tons_loaded, trip_count, status, notes) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [assignment_id, weighbridge_id, supervisor_id, load_date, week_number, year, tons_loaded, trip_count, status, notes]
    );
    
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  const { assignment_id, weighbridge_id, supervisor_id, load_date, tons_loaded, trip_count, status, notes } = req.body;
  
  try {
    const result = await pool.query(
      `UPDATE loading_records 
       SET assignment_id = $1, weighbridge_id = $2, supervisor_id = $3, 
           load_date = $4, tons_loaded = $5, trip_count = $6, 
           status = $7, notes = $8, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $9 RETURNING *`,
      [assignment_id, weighbridge_id, supervisor_id, load_date, tons_loaded, trip_count, status, notes, req.params.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Loading record not found' });
    }
    
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/compute-financials', async (req, res, next) => {
  try {
    await pool.query('SELECT compute_loading_financials($1)', [req.params.id]);
    res.json({ success: true, message: 'Financials computed successfully' });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const result = await pool.query(
      'UPDATE loading_records SET status = $1 WHERE id = $2 RETURNING *',
      ['cancelled', req.params.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Loading record not found' });
    }
    
    res.json({ success: true, message: 'Loading record cancelled' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
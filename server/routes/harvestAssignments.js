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
    const { search, status, week, year } = req.query;
    let query = `
      SELECT ha.*, o.name as outgrower_name, o.field_code, h.name as headman_name,
             s.name as supervisor_name
      FROM harvest_assignments ha
      LEFT JOIN outgrowers o ON ha.outgrower_id = o.id
      LEFT JOIN headmen h ON ha.headman_id = h.id
      LEFT JOIN supervisors s ON h.supervisor_id = s.id
      WHERE 1=1
    `;
    let params = [];
    let paramIndex = 1;
    
    if (search) {
      query += ` AND (o.name ILIKE $${paramIndex} OR o.field_code ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }
    
    if (status) {
      query += ` AND ha.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }
    
    if (week) {
      query += ` AND ha.week_number = $${paramIndex}`;
      params.push(week);
      paramIndex++;
    }
    
    if (year) {
      query += ` AND ha.year = $${paramIndex}`;
      params.push(year);
      paramIndex++;
    }
    
    query += ' ORDER BY ha.assignment_date DESC';
    
    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT ha.*, o.name as outgrower_name, o.field_code, o.field_size_ha,
              h.name as headman_name, s.name as supervisor_name
       FROM harvest_assignments ha
       LEFT JOIN outgrowers o ON ha.outgrower_id = o.id
       LEFT JOIN headmen h ON ha.headman_id = h.id
       LEFT JOIN supervisors s ON h.supervisor_id = s.id
       WHERE ha.id = $1`,
      [req.params.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Harvest assignment not found' });
    }
    
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  const { headman_id, outgrower_id, assignment_date, turnup, expected_tonnage, status = 'pending', notes } = req.body;
  
  try {
    const assignmentDate = new Date(assignment_date);
    const week_number = getWeekNumber(assignmentDate);
    const year = assignmentDate.getFullYear();
    
    const result = await pool.query(
      `INSERT INTO harvest_assignments 
       (headman_id, outgrower_id, assignment_date, week_number, year, turnup, expected_tonnage, status, notes) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [headman_id, outgrower_id, assignment_date, week_number, year, turnup, expected_tonnage, status, notes]
    );
    
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  const { headman_id, outgrower_id, assignment_date, turnup, expected_tonnage, actual_tonnage, status, notes } = req.body;
  
  try {
    const result = await pool.query(
      `UPDATE harvest_assignments 
       SET headman_id = $1, outgrower_id = $2, assignment_date = $3, 
           turnup = $4, expected_tonnage = $5, actual_tonnage = $6, 
           status = $7, notes = $8, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $9 RETURNING *`,
      [headman_id, outgrower_id, assignment_date, turnup, expected_tonnage, actual_tonnage, status, notes, req.params.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Harvest assignment not found' });
    }
    
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/compute-financials', async (req, res, next) => {
  try {
    await pool.query('SELECT compute_harvest_financials($1)', [req.params.id]);
    res.json({ success: true, message: 'Financials computed successfully' });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const result = await pool.query(
      'UPDATE harvest_assignments SET status = $1 WHERE id = $2 RETURNING *',
      ['cancelled', req.params.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Harvest assignment not found' });
    }
    
    res.json({ success: true, message: 'Harvest assignment cancelled' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
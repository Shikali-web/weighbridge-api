const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');

// Get all trucks
router.get('/', async (req, res, next) => {
  try {
    const { search } = req.query;
    let query = `
      SELECT t.*, d.name as driver_name 
      FROM trucks t
      LEFT JOIN drivers d ON t.driver_id = d.id
      WHERE t.is_active = true
      ORDER BY t.plate_no
    `;
    let params = [];
    
    if (search) {
      query = `
        SELECT t.*, d.name as driver_name 
        FROM trucks t
        LEFT JOIN drivers d ON t.driver_id = d.id
        WHERE t.is_active = true AND (t.plate_no ILIKE $1 OR t.model ILIKE $1)
        ORDER BY t.plate_no
      `;
      params = [`%${search}%`];
    }
    
    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error fetching trucks:', err);
    next(err);
  }
});

// Get single truck
router.get('/:id', async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT t.*, d.name as driver_name 
       FROM trucks t
       LEFT JOIN drivers d ON t.driver_id = d.id
       WHERE t.id = $1`,
      [req.params.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Truck not found' });
    }
    
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Error fetching truck:', err);
    next(err);
  }
});

// Create truck
router.post('/', async (req, res, next) => {
  const { plate_no, model, capacity_tons, driver_id, is_active = true } = req.body;
  
  try {
    // Check if plate number already exists
    const existing = await pool.query(
      'SELECT id FROM trucks WHERE plate_no = $1',
      [plate_no]
    );
    
    if (existing.rows.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Plate number already exists' 
      });
    }
    
    const result = await pool.query(
      `INSERT INTO trucks (plate_no, model, capacity_tons, driver_id, is_active) 
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [plate_no, model, capacity_tons, driver_id || null, is_active]
    );
    
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Error creating truck:', err);
    next(err);
  }
});

// Update truck
router.put('/:id', async (req, res, next) => {
  const { plate_no, model, capacity_tons, driver_id, is_active } = req.body;
  
  try {
    // Check if plate number is being used by another truck
    if (plate_no) {
      const plateCheck = await pool.query(
        'SELECT id FROM trucks WHERE plate_no = $1 AND id != $2',
        [plate_no, req.params.id]
      );
      if (plateCheck.rows.length > 0) {
        return res.status(400).json({ 
          success: false, 
          message: 'Plate number already exists' 
        });
      }
    }
    
    const result = await pool.query(
      `UPDATE trucks 
       SET plate_no = $1, model = $2, capacity_tons = $3, driver_id = $4, 
           is_active = $5, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $6 RETURNING *`,
      [plate_no, model, capacity_tons, driver_id || null, is_active, req.params.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Truck not found' });
    }
    
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Error updating truck:', err);
    next(err);
  }
});

// Delete truck (soft delete)
router.delete('/:id', async (req, res, next) => {
  try {
    const result = await pool.query(
      'UPDATE trucks SET is_active = false WHERE id = $1 RETURNING *',
      [req.params.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Truck not found' });
    }
    
    res.json({ success: true, message: 'Truck deleted successfully' });
  } catch (err) {
    console.error('Error deleting truck:', err);
    next(err);
  }
});

module.exports = router;
const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');

router.get('/', async (req, res, next) => {
  try {
    const { search } = req.query;
    let query = `
      SELECT o.*, db.band_code, w.name as weighbridge_name
      FROM outgrowers o
      LEFT JOIN distance_bands db ON o.distance_band_id = db.id
      LEFT JOIN weighbridges w ON o.weighbridge_id = w.id
      ORDER BY o.name
    `;
    let params = [];
    
    if (search) {
      query = `
        SELECT o.*, db.band_code, w.name as weighbridge_name
        FROM outgrowers o
        LEFT JOIN distance_bands db ON o.distance_band_id = db.id
        LEFT JOIN weighbridges w ON o.weighbridge_id = w.id
        WHERE o.name ILIKE $1 OR o.field_code ILIKE $1
        ORDER BY o.name
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
      `SELECT o.*, db.band_code, db.min_km, db.max_km, w.name as weighbridge_name
       FROM outgrowers o
       LEFT JOIN distance_bands db ON o.distance_band_id = db.id
       LEFT JOIN weighbridges w ON o.weighbridge_id = w.id
       WHERE o.id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Outgrower not found' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  const { name, field_code, field_size_ha, distance_band_id, weighbridge_id, location_notes, is_active = true } = req.body;
  try {
    const existing = await pool.query(
      'SELECT id FROM outgrowers WHERE field_code = $1',
      [field_code]
    );
    
    if (existing.rows.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Field code already exists' 
      });
    }
    
    const result = await pool.query(
      `INSERT INTO outgrowers (name, field_code, field_size_ha, distance_band_id, weighbridge_id, location_notes, is_active) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [name, field_code, field_size_ha, distance_band_id, weighbridge_id, location_notes, is_active]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  const { name, field_code, field_size_ha, distance_band_id, weighbridge_id, location_notes, is_active } = req.body;
  try {
    const result = await pool.query(
      `UPDATE outgrowers 
       SET name = $1, field_code = $2, field_size_ha = $3, distance_band_id = $4, 
           weighbridge_id = $5, location_notes = $6, is_active = $7, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $8 RETURNING *`,
      [name, field_code, field_size_ha, distance_band_id, weighbridge_id, location_notes, is_active, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Outgrower not found' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const result = await pool.query(
      'UPDATE outgrowers SET is_active = false WHERE id = $1 RETURNING *',
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Outgrower not found' });
    }
    res.json({ success: true, message: 'Outgrower deleted successfully' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
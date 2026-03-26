const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');

router.get('/', async (req, res, next) => {
  try {
    const result = await pool.query('SELECT * FROM distance_bands ORDER BY min_km');
    res.json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const result = await pool.query('SELECT * FROM distance_bands WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Distance band not found' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  const { band_code, min_km, max_km, transport_rate_per_ton, driver_rate_per_ton, sagib_retention_per_ton } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO distance_bands (band_code, min_km, max_km, transport_rate_per_ton, driver_rate_per_ton, sagib_retention_per_ton) 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [band_code, min_km, max_km, transport_rate_per_ton, driver_rate_per_ton, sagib_retention_per_ton]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  const { band_code, min_km, max_km, transport_rate_per_ton, driver_rate_per_ton, sagib_retention_per_ton } = req.body;
  try {
    const result = await pool.query(
      `UPDATE distance_bands 
       SET band_code = $1, min_km = $2, max_km = $3, transport_rate_per_ton = $4, 
           driver_rate_per_ton = $5, sagib_retention_per_ton = $6, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $7 RETURNING *`,
      [band_code, min_km, max_km, transport_rate_per_ton, driver_rate_per_ton, sagib_retention_per_ton, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Distance band not found' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const result = await pool.query('DELETE FROM distance_bands WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Distance band not found' });
    }
    res.json({ success: true, message: 'Distance band deleted successfully' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
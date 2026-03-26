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
    const { search, week, year, driver_id, weighbridge_id, distance_band_id } = req.query;
    let query = `
      SELECT tt.*, t.plate_no, t.model, d.name as driver_name, o.name as outgrower_name,
             w.name as weighbridge_name, db.band_code
      FROM transport_trips tt
      LEFT JOIN trucks t ON tt.truck_id = t.id
      LEFT JOIN drivers d ON tt.driver_id = d.id
      LEFT JOIN outgrowers o ON tt.outgrower_id = o.id
      LEFT JOIN weighbridges w ON tt.weighbridge_id = w.id
      LEFT JOIN distance_bands db ON tt.distance_band_id = db.id
      WHERE 1=1
    `;
    let params = [];
    let paramIndex = 1;
    
    if (search) {
      query += ` AND (t.plate_no ILIKE $${paramIndex} OR d.name ILIKE $${paramIndex} OR o.name ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }
    
    if (week) {
      query += ` AND tt.week_number = $${paramIndex}`;
      params.push(week);
      paramIndex++;
    }
    
    if (year) {
      query += ` AND tt.year = $${paramIndex}`;
      params.push(year);
      paramIndex++;
    }
    
    if (driver_id) {
      query += ` AND tt.driver_id = $${paramIndex}`;
      params.push(driver_id);
      paramIndex++;
    }
    
    if (weighbridge_id) {
      query += ` AND tt.weighbridge_id = $${paramIndex}`;
      params.push(weighbridge_id);
      paramIndex++;
    }
    
    if (distance_band_id) {
      query += ` AND tt.distance_band_id = $${paramIndex}`;
      params.push(distance_band_id);
      paramIndex++;
    }
    
    query += ' ORDER BY tt.trip_date DESC';
    
    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT tt.*, t.plate_no, t.model, d.name as driver_name, o.name as outgrower_name,
              w.name as weighbridge_name, db.band_code, db.min_km, db.max_km
       FROM transport_trips tt
       LEFT JOIN trucks t ON tt.truck_id = t.id
       LEFT JOIN drivers d ON tt.driver_id = d.id
       LEFT JOIN outgrowers o ON tt.outgrower_id = o.id
       LEFT JOIN weighbridges w ON tt.weighbridge_id = w.id
       LEFT JOIN distance_bands db ON tt.distance_band_id = db.id
       WHERE tt.id = $1`,
      [req.params.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Transport trip not found' });
    }
    
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  const { truck_id, driver_id, outgrower_id, weighbridge_id, distance_band_id, 
          trip_date, tons_transported, transport_rate, total_revenue, 
          driver_payment, sagib_retention, notes } = req.body;
  
  try {
    const tripDate = new Date(trip_date);
    const week_number = getWeekNumber(tripDate);
    const year = tripDate.getFullYear();
    
    const result = await pool.query(
      `INSERT INTO transport_trips 
       (truck_id, driver_id, outgrower_id, weighbridge_id, distance_band_id, 
        trip_date, week_number, year, tons_transported, transport_rate, 
        total_revenue, driver_payment, sagib_retention, notes) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING *`,
      [truck_id, driver_id, outgrower_id, weighbridge_id, distance_band_id, 
       trip_date, week_number, year, tons_transported, transport_rate, 
       total_revenue, driver_payment, sagib_retention, notes]
    );
    
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  const { truck_id, driver_id, outgrower_id, weighbridge_id, distance_band_id, 
          trip_date, tons_transported, transport_rate, total_revenue, 
          driver_payment, sagib_retention, notes } = req.body;
  
  try {
    const result = await pool.query(
      `UPDATE transport_trips 
       SET truck_id = $1, driver_id = $2, outgrower_id = $3, weighbridge_id = $4, 
           distance_band_id = $5, trip_date = $6, tons_transported = $7, 
           transport_rate = $8, total_revenue = $9, driver_payment = $10, 
           sagib_retention = $11, notes = $12, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $13 RETURNING *`,
      [truck_id, driver_id, outgrower_id, weighbridge_id, distance_band_id, 
       trip_date, tons_transported, transport_rate, total_revenue, 
       driver_payment, sagib_retention, notes, req.params.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Transport trip not found' });
    }
    
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const result = await pool.query('DELETE FROM transport_trips WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Transport trip not found' });
    }
    res.json({ success: true, message: 'Transport trip deleted successfully' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
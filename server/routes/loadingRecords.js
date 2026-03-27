const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');

// Helper functions
function getWeekNumber(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
  const week1 = new Date(d.getFullYear(), 0, 4);
  return 1 + Math.round(((d - week1) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
}

function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}

function getWeekEnd(date) {
  const start = getWeekStart(date);
  return new Date(start.setDate(start.getDate() + 6));
}

// Get available assignments for loading (not manually completed)
router.get('/available-assignments', async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT hawt.*, o.name as outgrower_name, o.field_code, h.name as headman_name
      FROM harvest_assignments_with_totals hawt
      LEFT JOIN outgrowers o ON hawt.outgrower_id = o.id
      LEFT JOIN headmen h ON hawt.headman_id = h.id
      WHERE hawt.manually_completed = false 
        AND hawt.status != 'cancelled'
      ORDER BY hawt.assignment_date DESC
    `);
    
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error fetching available assignments:', err);
    next(err);
  }
});

// Get all loading records
router.get('/', async (req, res, next) => {
  try {
    const { search, status, week, year, weighbridge_id, supervisor_id, assignment_id } = req.query;
    let query = `
      SELECT lr.*, ha.outgrower_id, o.name as outgrower_name, o.field_code,
             h.name as headman_name, w.name as weighbridge_name, s.name as supervisor_name,
             ha.expected_tonnage, hawt.actual_tonnage as total_loaded
      FROM loading_records lr
      LEFT JOIN harvest_assignments ha ON lr.assignment_id = ha.id
      LEFT JOIN harvest_assignments_with_totals hawt ON ha.id = hawt.id
      LEFT JOIN outgrowers o ON ha.outgrower_id = o.id
      LEFT JOIN headmen h ON ha.headman_id = h.id
      LEFT JOIN weighbridges w ON lr.weighbridge_id = w.id
      LEFT JOIN supervisors s ON lr.supervisor_id = s.id
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
    
    if (assignment_id) {
      query += ` AND lr.assignment_id = $${paramIndex}`;
      params.push(assignment_id);
      paramIndex++;
    }
    
    query += ' ORDER BY lr.load_date DESC';
    
    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error in GET /loading-records:', err);
    next(err);
  }
});

// Get single loading record
router.get('/:id', async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT lr.*, ha.outgrower_id, o.name as outgrower_name, o.field_code,
              h.name as headman_name, w.name as weighbridge_name, s.name as supervisor_name,
              ha.expected_tonnage, hawt.actual_tonnage as total_loaded
       FROM loading_records lr
       LEFT JOIN harvest_assignments ha ON lr.assignment_id = ha.id
       LEFT JOIN harvest_assignments_with_totals hawt ON ha.id = hawt.id
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
    console.error('Error in GET /loading-records/:id:', err);
    next(err);
  }
});

// Create loading record - NO RESTRICTION on tonnage
router.post('/', async (req, res, next) => {
  const { assignment_id, weighbridge_id, supervisor_id, load_date, tons_loaded, trip_count, status = 'completed', notes } = req.body;
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Check if assignment exists and is not manually completed
    const assignmentCheck = await client.query(
      'SELECT manually_completed, status FROM harvest_assignments WHERE id = $1',
      [assignment_id]
    );
    
    if (assignmentCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Harvest assignment not found' });
    }
    
    const assignment = assignmentCheck.rows[0];
    
    // Check if assignment is already manually completed
    if (assignment.manually_completed === true) {
      await client.query('ROLLBACK');
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot add load to completed harvest assignment. The field has been marked as fully harvested.' 
      });
    }
    
    // Check if assignment is cancelled
    if (assignment.status === 'cancelled') {
      await client.query('ROLLBACK');
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot add load to cancelled harvest assignment.' 
      });
    }
    
    const loadDate = new Date(load_date);
    const weekStart = getWeekStart(loadDate);
    const weekEnd = getWeekEnd(loadDate);
    const week_number = getWeekNumber(loadDate);
    const year = loadDate.getFullYear();
    
    // Get current total loaded for display purposes
    const currentLoaded = await client.query(
      'SELECT COALESCE(SUM(tons_loaded), 0) as total FROM loading_records WHERE assignment_id = $1',
      [assignment_id]
    );
    
    const currentTotal = parseFloat(currentLoaded.rows[0].total);
    
    // Insert loading record
    const result = await client.query(
      `INSERT INTO loading_records 
       (assignment_id, weighbridge_id, supervisor_id, load_date, week_start, week_end, week_number, year, tons_loaded, trip_count, status, notes) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
      [assignment_id, weighbridge_id, supervisor_id, load_date, weekStart, weekEnd, week_number, year, tons_loaded, trip_count, status, notes]
    );
    
    // Update harvest assignment status to in_progress if this is the first load
    if (currentTotal === 0) {
      await client.query(
        'UPDATE harvest_assignments SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        ['in_progress', assignment_id]
      );
    }
    
    await client.query('COMMIT');
    
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error in POST /loading-records:', err);
    next(err);
  } finally {
    client.release();
  }
});

// Update loading record
router.put('/:id', async (req, res, next) => {
  const { assignment_id, weighbridge_id, supervisor_id, load_date, tons_loaded, trip_count, status, notes } = req.body;
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Get the original loading record to get the original assignment
    const originalRecord = await client.query(
      'SELECT assignment_id FROM loading_records WHERE id = $1',
      [req.params.id]
    );
    
    if (originalRecord.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Loading record not found' });
    }
    
    const originalAssignmentId = originalRecord.rows[0].assignment_id;
    
    // Check if assignment is manually completed
    const assignmentCheck = await client.query(
      'SELECT manually_completed FROM harvest_assignments WHERE id = $1',
      [assignment_id || originalAssignmentId]
    );
    
    if (assignmentCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Harvest assignment not found' });
    }
    
    const assignment = assignmentCheck.rows[0];
    
    if (assignment.manually_completed === true) {
      await client.query('ROLLBACK');
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot update loading record for completed harvest assignment.' 
      });
    }
    
    const loadDate = new Date(load_date);
    const weekStart = getWeekStart(loadDate);
    const weekEnd = getWeekEnd(loadDate);
    const week_number = getWeekNumber(loadDate);
    const year = loadDate.getFullYear();
    
    const result = await client.query(
      `UPDATE loading_records 
       SET assignment_id = $1, weighbridge_id = $2, supervisor_id = $3, 
           load_date = $4, week_start = $5, week_end = $6, week_number = $7, 
           year = $8, tons_loaded = $9, trip_count = $10, 
           status = $11, notes = $12, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $13 RETURNING *`,
      [assignment_id || originalAssignmentId, weighbridge_id, supervisor_id, load_date, 
       weekStart, weekEnd, week_number, year, tons_loaded, trip_count, status, notes, req.params.id]
    );
    
    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Loading record not found' });
    }
    
    await client.query('COMMIT');
    
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error in PUT /loading-records/:id:', err);
    next(err);
  } finally {
    client.release();
  }
});

// Compute loading financials
router.post('/:id/compute-financials', async (req, res, next) => {
  const client = await pool.connect();
  
  try {
    const recordResult = await client.query(
      `SELECT lr.* FROM loading_records lr WHERE lr.id = $1`,
      [req.params.id]
    );
    
    if (recordResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Loading record not found' });
    }
    
    const record = recordResult.rows[0];
    
    const ratesResult = await client.query(`
      SELECT config_key, config_value FROM rate_config 
      WHERE effective_from <= CURRENT_DATE 
      ORDER BY effective_from DESC
    `);
    
    const rates = {};
    ratesResult.rows.forEach(row => {
      rates[row.config_key] = parseFloat(row.config_value);
    });
    
    const loading_factory_rate = rates['loading_factory_rate'] || 150;
    const loading_sagib_rate = rates['loading_sagib_rate'] || 120;
    const supervisor_per_trip = rates['supervisor_per_trip'] || 100;
    
    const factory_revenue = record.tons_loaded * loading_factory_rate;
    const sagib_revenue = record.tons_loaded * loading_sagib_rate;
    const loader_payment = sagib_revenue;
    const supervisor_payment = record.trip_count * supervisor_per_trip;
    const gross_profit = factory_revenue - loader_payment - supervisor_payment;
    const final_sagib_net = gross_profit;
    
    const loadDate = new Date(record.load_date);
    const weekStart = getWeekStart(loadDate);
    const weekEnd = getWeekEnd(loadDate);
    const week_number = getWeekNumber(loadDate);
    const year = loadDate.getFullYear();
    
    await client.query(`
      INSERT INTO loading_financials (
        loading_record_id, week_start, week_end, week_number, year,
        factory_revenue, sagib_revenue, loader_payment, supervisor_payment,
        gross_profit, final_sagib_net
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      ON CONFLICT (loading_record_id) DO UPDATE SET
        factory_revenue = EXCLUDED.factory_revenue,
        sagib_revenue = EXCLUDED.sagib_revenue,
        loader_payment = EXCLUDED.loader_payment,
        supervisor_payment = EXCLUDED.supervisor_payment,
        gross_profit = EXCLUDED.gross_profit,
        final_sagib_net = EXCLUDED.final_sagib_net,
        computed_at = CURRENT_TIMESTAMP
    `, [
      record.id, weekStart, weekEnd, week_number, year,
      factory_revenue, sagib_revenue, loader_payment, supervisor_payment,
      gross_profit, final_sagib_net
    ]);
    
    const financialsResult = await client.query(
      'SELECT * FROM loading_financials WHERE loading_record_id = $1',
      [record.id]
    );
    
    res.json({ 
      success: true, 
      message: 'Loading financials computed successfully',
      data: financialsResult.rows[0]
    });
  } catch (err) {
    console.error('Error computing loading financials:', err);
    next(err);
  } finally {
    client.release();
  }
});

// Delete loading record
router.delete('/:id', async (req, res, next) => {
  const client = await pool.connect();
  
  try {
    const recordResult = await client.query(
      'SELECT assignment_id FROM loading_records WHERE id = $1',
      [req.params.id]
    );
    
    if (recordResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Loading record not found' });
    }
    
    const assignment_id = recordResult.rows[0].assignment_id;
    
    await client.query('BEGIN');
    
    await client.query('DELETE FROM loading_records WHERE id = $1', [req.params.id]);
    
    // Update harvest assignment status if no loads remain
    const remainingLoaded = await client.query(
      'SELECT COALESCE(SUM(tons_loaded), 0) as total FROM loading_records WHERE assignment_id = $1',
      [assignment_id]
    );
    
    const totalLoaded = parseFloat(remainingLoaded.rows[0].total);
    
    if (totalLoaded === 0) {
      await client.query(
        'UPDATE harvest_assignments SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        ['pending', assignment_id]
      );
    }
    
    await client.query('COMMIT');
    
    res.json({ success: true, message: 'Loading record deleted successfully' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error deleting loading record:', err);
    next(err);
  } finally {
    client.release();
  }
});

module.exports = router;
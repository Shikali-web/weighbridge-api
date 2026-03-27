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

// Get all harvest assignments (using view)
router.get('/', async (req, res, next) => {
  try {
    const { search, status, week, year } = req.query;
    let query = `
      SELECT hawt.*, 
             o.name as outgrower_name, o.field_code, o.field_size_ha,
             h.name as headman_name,
             COALESCE(hf.factory_revenue, 0) as total_revenue,
             COALESCE(hf.final_headman_payment, 0) as headman_share,
             COALESCE(hf.final_sagib_net, 0) as sagib_net
      FROM harvest_assignments_with_totals hawt
      LEFT JOIN outgrowers o ON hawt.outgrower_id = o.id
      LEFT JOIN headmen h ON hawt.headman_id = h.id
      LEFT JOIN harvest_financials hf ON hawt.id = hf.assignment_id
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
      query += ` AND hawt.computed_status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }
    
    if (week) {
      query += ` AND hawt.week_number = $${paramIndex}`;
      params.push(week);
      paramIndex++;
    }
    
    if (year) {
      query += ` AND hawt.year = $${paramIndex}`;
      params.push(year);
      paramIndex++;
    }
    
    query += ' ORDER BY hawt.assignment_date DESC';
    
    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error in GET /harvest-assignments:', err);
    next(err);
  }
});

// Get single harvest assignment (using view)
router.get('/:id', async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT hawt.*, 
              o.name as outgrower_name, o.field_code, o.field_size_ha,
              h.name as headman_name
       FROM harvest_assignments_with_totals hawt
       LEFT JOIN outgrowers o ON hawt.outgrower_id = o.id
       LEFT JOIN headmen h ON hawt.headman_id = h.id
       WHERE hawt.id = $1`,
      [req.params.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Harvest assignment not found' });
    }
    
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Error in GET /harvest-assignments/:id:', err);
    next(err);
  }
});

// Create harvest assignment
router.post('/', async (req, res, next) => {
  const { headman_id, outgrower_id, assignment_date, turnup, status = 'pending', notes } = req.body;
  
  try {
    const assignmentDate = new Date(assignment_date);
    const weekStart = getWeekStart(assignmentDate);
    const weekEnd = getWeekEnd(assignmentDate);
    const week_number = getWeekNumber(assignmentDate);
    const year = assignmentDate.getFullYear();
    
    const result = await pool.query(
      `INSERT INTO harvest_assignments 
       (headman_id, outgrower_id, assignment_date, week_start, week_end, week_number, year, turnup, status, notes) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [headman_id, outgrower_id, assignment_date, weekStart, weekEnd, week_number, year, turnup, status, notes]
    );
    
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Error in POST /harvest-assignments:', err);
    next(err);
  }
});

// Update harvest assignment
router.put('/:id', async (req, res, next) => {
  const { headman_id, outgrower_id, assignment_date, turnup, status, notes, manually_completed } = req.body;
  
  try {
    let completedAt = null;
    if (manually_completed === true) {
      completedAt = new Date();
    }
    
    const result = await pool.query(
      `UPDATE harvest_assignments 
       SET headman_id = $1, outgrower_id = $2, assignment_date = $3, 
           turnup = $4, status = $5, notes = $6, manually_completed = $7, 
           completed_at = $8, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $9 RETURNING *`,
      [headman_id, outgrower_id, assignment_date, turnup, status, notes, manually_completed, completedAt, req.params.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Harvest assignment not found' });
    }
    
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Error in PUT /harvest-assignments/:id:', err);
    next(err);
  }
});

// Mark harvest as complete
router.post('/:id/complete', async (req, res, next) => {
  try {
    const result = await pool.query(
      `UPDATE harvest_assignments 
       SET manually_completed = true, completed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $1 RETURNING *`,
      [req.params.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Harvest assignment not found' });
    }
    
    res.json({ success: true, message: 'Harvest assignment marked as complete', data: result.rows[0] });
  } catch (err) {
    console.error('Error completing harvest assignment:', err);
    next(err);
  }
});

// Compute financials
router.post('/:id/compute-financials', async (req, res, next) => {
  const client = await pool.connect();
  
  try {
    const assignmentResult = await client.query(
      `SELECT hawt.*, o.name as outgrower_name, h.name as headman_name,
              hawt.week_start, hawt.week_end
       FROM harvest_assignments_with_totals hawt
       LEFT JOIN outgrowers o ON hawt.outgrower_id = o.id
       LEFT JOIN headmen h ON hawt.headman_id = h.id
       WHERE hawt.id = $1`,
      [req.params.id]
    );
    
    if (assignmentResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Harvest assignment not found' });
    }
    
    const assignment = assignmentResult.rows[0];
    const actual_tonnage = parseFloat(assignment.actual_tonnage) || 0;
    
    if (actual_tonnage <= 0) {
      return res.status(400).json({ success: false, message: 'Cannot compute financials without any loads recorded' });
    }
    
    const ratesResult = await client.query(`
      SELECT config_key, config_value FROM rate_config 
      WHERE effective_from <= CURRENT_DATE 
      ORDER BY effective_from DESC
    `);
    
    const rates = {};
    ratesResult.rows.forEach(row => {
      rates[row.config_key] = parseFloat(row.config_value);
    });
    
    const cutter_daily_rate = rates['cutter_daily_rate'] || 500;
    const factory_payment_per_ton = rates['factory_payment_per_ton'] || 300;
    
    const cutter_payment = assignment.turnup * cutter_daily_rate;
    const factory_revenue = actual_tonnage * factory_payment_per_ton;
    const gross_profit = factory_revenue - cutter_payment;
    const headman_base_share = gross_profit * 0.40;
    const sagib_base_share = gross_profit * 0.60;
    const tonnage_diff = actual_tonnage - assignment.expected_tonnage;
    
    let performance_adjustment = 0;
    if (tonnage_diff > 0) {
      const extra_profit = tonnage_diff * factory_payment_per_ton;
      performance_adjustment = extra_profit * 0.40;
    } else if (tonnage_diff < 0) {
      const lost_profit = Math.abs(tonnage_diff) * factory_payment_per_ton;
      performance_adjustment = -(lost_profit * 0.60);
    }
    
    const final_headman_payment = headman_base_share + performance_adjustment;
    const final_sagib_net = sagib_base_share - performance_adjustment;
    
    const assignmentDate = new Date(assignment.assignment_date);
    const weekStart = getWeekStart(assignmentDate);
    const weekEnd = getWeekEnd(assignmentDate);
    const week_number = getWeekNumber(assignmentDate);
    const year = assignmentDate.getFullYear();
    
    await client.query(`
      INSERT INTO harvest_financials (
        assignment_id, week_start, week_end, week_number, year,
        factory_revenue, cutter_payment, gross_profit,
        headman_share_40, sagib_share_60,
        tonnage_diff, performance_adjustment,
        final_headman_payment, final_sagib_net
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      ON CONFLICT (assignment_id) DO UPDATE SET
        factory_revenue = EXCLUDED.factory_revenue,
        cutter_payment = EXCLUDED.cutter_payment,
        gross_profit = EXCLUDED.gross_profit,
        headman_share_40 = EXCLUDED.headman_share_40,
        sagib_share_60 = EXCLUDED.sagib_share_60,
        tonnage_diff = EXCLUDED.tonnage_diff,
        performance_adjustment = EXCLUDED.performance_adjustment,
        final_headman_payment = EXCLUDED.final_headman_payment,
        final_sagib_net = EXCLUDED.final_sagib_net,
        computed_at = CURRENT_TIMESTAMP
    `, [
      assignment.id, weekStart, weekEnd, week_number, year,
      factory_revenue, cutter_payment, gross_profit,
      headman_base_share, sagib_base_share,
      tonnage_diff, performance_adjustment,
      final_headman_payment, final_sagib_net
    ]);
    
    const financialsResult = await client.query(
      'SELECT * FROM harvest_financials WHERE assignment_id = $1',
      [assignment.id]
    );
    
    res.json({ 
      success: true, 
      message: 'Financials computed successfully',
      data: financialsResult.rows[0]
    });
  } catch (err) {
    console.error('Error computing financials:', err);
    next(err);
  } finally {
    client.release();
  }
});

// Delete harvest assignment
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

// Get all harvest assignments (using view)
router.get('/', async (req, res, next) => {
  try {
    const { search, status, week, year, limit } = req.query;
    let query = `
      SELECT hawt.*, 
             o.name as outgrower_name, o.field_code, o.field_size_ha,
             h.name as headman_name,
             COALESCE(hf.factory_revenue, 0) as total_revenue,
             COALESCE(hf.final_headman_payment, 0) as headman_share,
             COALESCE(hf.final_sagib_net, 0) as sagib_net
      FROM harvest_assignments_with_totals hawt
      LEFT JOIN outgrowers o ON hawt.outgrower_id = o.id
      LEFT JOIN headmen h ON hawt.headman_id = h.id
      LEFT JOIN harvest_financials hf ON hawt.id = hf.assignment_id
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
      query += ` AND hawt.computed_status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }
    
    if (week) {
      query += ` AND hawt.week_number = $${paramIndex}`;
      params.push(week);
      paramIndex++;
    }
    
    if (year) {
      query += ` AND hawt.year = $${paramIndex}`;
      params.push(year);
      paramIndex++;
    }
    
    query += ' ORDER BY hawt.assignment_date DESC';
    
    if (limit) {
      query += ` LIMIT $${paramIndex}`;
      params.push(limit);
    }
    
    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error in GET /harvest-assignments:', err);
    next(err);
  }
});
module.exports = router;
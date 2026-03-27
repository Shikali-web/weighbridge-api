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

// Get all harvest assignments
router.get('/', async (req, res, next) => {
  try {
    const { search, status, week, year } = req.query;
    let query = `
      SELECT ha.*, 
             o.name as outgrower_name, o.field_code, o.field_size_ha,
             h.name as headman_name,
             COALESCE(hf.total_factory_revenue, 0) as total_revenue,
             COALESCE(hf.headman_harvest_share, 0) as headman_share,
             COALESCE(hf.sagib_net_harvest, 0) as sagib_net
      FROM harvest_assignments ha
      LEFT JOIN outgrowers o ON ha.outgrower_id = o.id
      LEFT JOIN headmen h ON ha.headman_id = h.id
      LEFT JOIN harvest_financials hf ON ha.id = hf.assignment_id
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
    console.error('Error in GET /harvest-assignments:', err);
    next(err);
  }
});

// Get single harvest assignment
router.get('/:id', async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT ha.*, 
              o.name as outgrower_name, o.field_code, o.field_size_ha,
              h.name as headman_name
       FROM harvest_assignments ha
       LEFT JOIN outgrowers o ON ha.outgrower_id = o.id
       LEFT JOIN headmen h ON ha.headman_id = h.id
       WHERE ha.id = $1`,
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
    console.error('Error in POST /harvest-assignments:', err);
    next(err);
  }
});

// Update harvest assignment - NO updated_at reference
router.put('/:id', async (req, res, next) => {
  const { headman_id, outgrower_id, assignment_date, turnup, expected_tonnage, actual_tonnage, status, notes } = req.body;
  
  try {
    const result = await pool.query(
      `UPDATE harvest_assignments 
       SET headman_id = $1, outgrower_id = $2, assignment_date = $3, 
           turnup = $4, expected_tonnage = $5, actual_tonnage = $6, 
           status = $7, notes = $8
       WHERE id = $9 RETURNING *`,
      [headman_id, outgrower_id, assignment_date, turnup, expected_tonnage, actual_tonnage, status, notes, req.params.id]
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

// Compute financials
router.post('/:id/compute-financials', async (req, res, next) => {
  const client = await pool.connect();
  
  try {
    // Get assignment details
    const assignmentResult = await client.query(
      'SELECT * FROM harvest_assignments WHERE id = $1',
      [req.params.id]
    );
    
    if (assignmentResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Harvest assignment not found' });
    }
    
    const assignment = assignmentResult.rows[0];
    
    if (!assignment.actual_tonnage || assignment.actual_tonnage <= 0) {
      return res.status(400).json({ success: false, message: 'Cannot compute financials without actual tonnage' });
    }
    
    // Get rate configurations
    const ratesResult = await client.query(`
      SELECT config_key, config_value FROM rate_config 
      WHERE effective_from <= CURRENT_DATE 
      ORDER BY effective_from DESC
    `);
    
    // Create a map of rates
    const rates = {};
    ratesResult.rows.forEach(row => {
      rates[row.config_key] = parseFloat(row.config_value);
    });
    
    // Default rates if not found
    const factory_rate_cutters = rates['factory_rate_cutters'] || 500;
    const factory_rate_tonnage = rates['factory_rate_tonnage'] || 1000;
    const transaction_costs = rates['transaction_costs'] || 50;
    
    // Calculate financials
    const cutter_payment = assignment.turnup * factory_rate_cutters;
    const factory_revenue_tonnage = assignment.actual_tonnage * factory_rate_tonnage;
    const total_factory_revenue = cutter_payment + factory_revenue_tonnage;
    const gross_profit = total_factory_revenue - transaction_costs;
    const headman_commission = gross_profit * 0.40;
    const sagib_commission = gross_profit * 0.60;
    const headman_harvest_share = headman_commission;
    const sagib_net_harvest = sagib_commission;
    const diff_value = assignment.actual_tonnage - assignment.expected_tonnage;
    
    // Get week and year
    const assignmentDate = new Date(assignment.assignment_date);
    const week_number = getWeekNumber(assignmentDate);
    const year = assignmentDate.getFullYear();
    
    // Insert or update financials
    await client.query(`
      INSERT INTO harvest_financials (
        assignment_id, week_number, year,
        factory_revenue_cutters, factory_revenue_tonnage, total_factory_revenue,
        cutter_payment, transaction_costs, gross_profit,
        diff_value, headman_commission, sagib_commission,
        headman_harvest_share, sagib_net_harvest
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      ON CONFLICT (assignment_id) DO UPDATE SET
        factory_revenue_cutters = EXCLUDED.factory_revenue_cutters,
        factory_revenue_tonnage = EXCLUDED.factory_revenue_tonnage,
        total_factory_revenue = EXCLUDED.total_factory_revenue,
        cutter_payment = EXCLUDED.cutter_payment,
        transaction_costs = EXCLUDED.transaction_costs,
        gross_profit = EXCLUDED.gross_profit,
        diff_value = EXCLUDED.diff_value,
        headman_commission = EXCLUDED.headman_commission,
        sagib_commission = EXCLUDED.sagib_commission,
        headman_harvest_share = EXCLUDED.headman_harvest_share,
        sagib_net_harvest = EXCLUDED.sagib_net_harvest
    `, [
      assignment.id, week_number, year,
      cutter_payment, factory_revenue_tonnage, total_factory_revenue,
      cutter_payment, transaction_costs, gross_profit,
      diff_value, headman_commission, sagib_commission,
      headman_harvest_share, sagib_net_harvest
    ]);
    
    // Get the updated financials
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

// Delete harvest assignment (soft delete)
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
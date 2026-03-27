const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');

// Helper: Get week dates from week number and year (Friday to Thursday)
function getWeekDates(week, year) {
  // Find the first Thursday of the year
  const firstThursday = new Date(year, 0, 1);
  while (firstThursday.getDay() !== 4) {
    firstThursday.setDate(firstThursday.getDate() + 1);
  }
  // Calculate the Friday (week start)
  const weekStart = new Date(firstThursday);
  weekStart.setDate(firstThursday.getDate() + (week - 1) * 7 - 1);
  // Thursday is week end
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  return { week_start: weekStart, week_end: weekEnd };
}

// Helper: Get week number from date
function getWeekNumber(date) {
  const d = new Date(date);
  const dayOfWeek = d.getDay();
  const thursday = new Date(d);
  thursday.setDate(d.getDate() + (4 - dayOfWeek));
  const firstThursday = new Date(thursday.getFullYear(), 0, 1);
  while (firstThursday.getDay() !== 4) {
    firstThursday.setDate(firstThursday.getDate() + 1);
  }
  const diffDays = Math.floor((thursday - firstThursday) / (1000 * 60 * 60 * 24));
  return Math.floor(diffDays / 7) + 1;
}

// ============ DEBUG ENDPOINT ============
router.get('/debug/:week/:year', async (req, res, next) => {
  try {
    const { week, year } = req.params;
    const { week_start, week_end } = getWeekDates(parseInt(week), parseInt(year));
    
    // Check harvest assignments in date range
    const assignments = await pool.query(`
      SELECT ha.*, h.name as headman_name
      FROM harvest_assignments ha
      LEFT JOIN headmen h ON ha.headman_id = h.id
      WHERE ha.assignment_date BETWEEN $1::date AND $2::date
    `, [week_start, week_end]);
    
    // Check loading records in date range
    const loading = await pool.query(`
      SELECT lr.*, ha.headman_id, h.name as headman_name
      FROM loading_records lr
      LEFT JOIN harvest_assignments ha ON lr.assignment_id = ha.id
      LEFT JOIN headmen h ON ha.headman_id = h.id
      WHERE lr.load_date BETWEEN $1::date AND $2::date
    `, [week_start, week_end]);
    
    // Check transport trips in date range
    const transport = await pool.query(`
      SELECT tt.*, d.name as driver_name
      FROM transport_trips tt
      LEFT JOIN drivers d ON tt.driver_id = d.id
      WHERE tt.trip_date BETWEEN $1::date AND $2::date
    `, [week_start, week_end]);
    
    res.json({
      success: true,
      data: {
        week_range: { week_start, week_end, week_number: parseInt(week), year: parseInt(year) },
        assignments: assignments.rows,
        loading_records: loading.rows,
        transport_trips: transport.rows,
        assignments_count: assignments.rows.length,
        loading_count: loading.rows.length,
        transport_count: transport.rows.length
      }
    });
  } catch (err) {
    console.error('Debug error:', err);
    next(err);
  }
});

// ============ HEADMAN PAYROLL ============
router.get('/headman/:week/:year', async (req, res, next) => {
  try {
    const { week, year } = req.params;
    const { week_start, week_end } = getWeekDates(parseInt(week), parseInt(year));
    
    console.log(`Fetching headman payroll for week ${week}, year ${year}`);
    console.log(`Date range: ${week_start} to ${week_end}`);
    
    const result = await pool.query(`
      SELECT 
        h.id as headman_id,
        h.name as headman_name,
        s.name as supervisor_name,
        COALESCE(SUM(ha.expected_tonnage), 0) as expected_tons,
        COALESCE(SUM(hawt.actual_tonnage), 0) as actual_tons,
        COALESCE(SUM(hawt.actual_tonnage - ha.expected_tonnage), 0) as tonnage_diff,
        COALESCE(SUM((hawt.actual_tonnage * 300) - (ha.turnup * 500)), 0) * 0.4 as harvest_payment,
        COALESCE(SUM((lr.tons_loaded * 30) - (lr.trip_count * 100)), 0) * 0.4 as loading_payment,
        COALESCE(
          (COALESCE(SUM((hawt.actual_tonnage * 300) - (ha.turnup * 500)), 0) * 0.4) +
          (COALESCE(SUM((lr.tons_loaded * 30) - (lr.trip_count * 100)), 0) * 0.4), 
          0
        ) as total_payable,
        false as is_paid,
        NULL as paid_date
      FROM headmen h
      LEFT JOIN harvest_assignments ha ON h.id = ha.headman_id 
        AND ha.assignment_date BETWEEN $1::date AND $2::date
      LEFT JOIN harvest_assignments_with_totals hawt ON ha.id = hawt.id
      LEFT JOIN loading_records lr ON ha.id = lr.assignment_id 
        AND lr.load_date BETWEEN $1::date AND $2::date
      LEFT JOIN supervisors s ON h.supervisor_id = s.id
      WHERE h.is_active = true
      GROUP BY h.id, h.name, s.name
      HAVING 
        COALESCE(SUM(hawt.actual_tonnage), 0) > 0 OR 
        COALESCE(SUM(lr.tons_loaded), 0) > 0
      ORDER BY total_payable DESC
    `, [week_start, week_end]);
    
    console.log(`Found ${result.rows.length} headmen with payroll data`);
    
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error fetching headman payroll:', err);
    next(err);
  }
});

router.post('/generate-headman/:week/:year', async (req, res, next) => {
  const client = await pool.connect();
  
  try {
    const { week, year } = req.params;
    const { week_start, week_end } = getWeekDates(parseInt(week), parseInt(year));
    
    console.log(`Generating headman payroll for week ${week}, year ${year}`);
    console.log(`Date range: ${week_start} to ${week_end}`);
    
    await client.query('BEGIN');
    
    // Delete existing payroll for this week
    await client.query(
      'DELETE FROM weekly_headman_payroll WHERE week_number = $1 AND year = $2',
      [week, year]
    );
    
    // Generate new payroll from actual data
    const result = await client.query(`
      INSERT INTO weekly_headman_payroll (
        headman_id, week_start, week_end, week_number, year,
        total_expected_tonnage, total_actual_tonnage, total_tonnage_diff,
        harvest_profit_share, loading_profit_share, total_payable,
        generated_at
      )
      SELECT 
        h.id,
        $1::date as week_start,
        $2::date as week_end,
        $3 as week_number,
        $4 as year,
        COALESCE(SUM(ha.expected_tonnage), 0) as total_expected_tonnage,
        COALESCE(SUM(hawt.actual_tonnage), 0) as total_actual_tonnage,
        COALESCE(SUM(hawt.actual_tonnage - ha.expected_tonnage), 0) as total_tonnage_diff,
        COALESCE(SUM((hawt.actual_tonnage * 300) - (ha.turnup * 500)), 0) * 0.4 as harvest_profit_share,
        COALESCE(SUM((lr.tons_loaded * 30) - (lr.trip_count * 100)), 0) * 0.4 as loading_profit_share,
        COALESCE(
          (COALESCE(SUM((hawt.actual_tonnage * 300) - (ha.turnup * 500)), 0) * 0.4) +
          (COALESCE(SUM((lr.tons_loaded * 30) - (lr.trip_count * 100)), 0) * 0.4), 
          0
        ) as total_payable,
        CURRENT_TIMESTAMP
      FROM headmen h
      LEFT JOIN harvest_assignments ha ON h.id = ha.headman_id 
        AND ha.assignment_date BETWEEN $1::date AND $2::date
      LEFT JOIN harvest_assignments_with_totals hawt ON ha.id = hawt.id
      LEFT JOIN loading_records lr ON ha.id = lr.assignment_id 
        AND lr.load_date BETWEEN $1::date AND $2::date
      WHERE h.is_active = true
      GROUP BY h.id
      HAVING 
        COALESCE(SUM(hawt.actual_tonnage), 0) > 0 OR 
        COALESCE(SUM(lr.tons_loaded), 0) > 0
    `, [week_start, week_end, week, year]);
    
    await client.query('COMMIT');
    
    console.log(`Generated ${result.rowCount} headman payroll records`);
    
    res.json({ 
      success: true, 
      message: `Headman payroll generated for week ${week}, ${year} (${week_start.toLocaleDateString()} - ${week_end.toLocaleDateString()})`,
      count: result.rowCount
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error generating headman payroll:', err);
    next(err);
  } finally {
    client.release();
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
    console.error('Error marking headman payroll as paid:', err);
    next(err);
  }
});

// ============ SUPERVISOR PAYROLL ============
router.get('/supervisor/:week/:year', async (req, res, next) => {
  try {
    const { week, year } = req.params;
    const { week_start, week_end } = getWeekDates(parseInt(week), parseInt(year));
    
    const result = await pool.query(`
      SELECT 
        s.id as supervisor_id,
        s.name as supervisor_name,
        COUNT(DISTINCT lr.id) as total_trips,
        COALESCE(SUM(lr.tons_loaded), 0) as total_tons,
        COUNT(DISTINCT lr.id) * 100 as weekly_pay,
        false as is_paid,
        NULL as paid_date
      FROM supervisors s
      LEFT JOIN loading_records lr ON s.id = lr.supervisor_id
        AND lr.load_date BETWEEN $1::date AND $2::date
      WHERE s.is_active = true
      GROUP BY s.id, s.name
      HAVING COUNT(DISTINCT lr.id) > 0
      ORDER BY weekly_pay DESC
    `, [week_start, week_end]);
    
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error fetching supervisor payroll:', err);
    next(err);
  }
});

router.post('/generate-supervisor/:week/:year', async (req, res, next) => {
  const client = await pool.connect();
  
  try {
    const { week, year } = req.params;
    const { week_start, week_end } = getWeekDates(parseInt(week), parseInt(year));
    
    await client.query('BEGIN');
    
    await client.query(
      'DELETE FROM weekly_supervisor_payroll WHERE week_number = $1 AND year = $2',
      [week, year]
    );
    
    const result = await client.query(`
      INSERT INTO weekly_supervisor_payroll (
        supervisor_id, week_start, week_end, week_number, year,
        total_trips, total_tons, total_payable,
        generated_at
      )
      SELECT 
        lr.supervisor_id,
        $1::date as week_start,
        $2::date as week_end,
        $3 as week_number,
        $4 as year,
        COUNT(DISTINCT lr.id) as total_trips,
        COALESCE(SUM(lr.tons_loaded), 0) as total_tons,
        COUNT(DISTINCT lr.id) * 100 as total_payable,
        CURRENT_TIMESTAMP
      FROM loading_records lr
      WHERE lr.load_date BETWEEN $1::date AND $2::date
      GROUP BY lr.supervisor_id
    `, [week_start, week_end, week, year]);
    
    await client.query('COMMIT');
    
    res.json({ 
      success: true, 
      message: `Supervisor payroll generated for week ${week}, ${year}`,
      count: result.rowCount
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error generating supervisor payroll:', err);
    next(err);
  } finally {
    client.release();
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
    console.error('Error marking supervisor payroll as paid:', err);
    next(err);
  }
});

// ============ DRIVER PAYROLL ============
router.get('/driver/:week/:year', async (req, res, next) => {
  try {
    const { week, year } = req.params;
    const { week_start, week_end } = getWeekDates(parseInt(week), parseInt(year));
    
    const result = await pool.query(`
      SELECT 
        d.id as driver_id,
        d.name as driver_name,
        t.plate_no as truck_plate,
        COUNT(DISTINCT tt.id) as total_trips,
        COALESCE(SUM(tt.tons_transported), 0) as total_tons,
        COALESCE(SUM(tt.driver_payment), 0) as weekly_pay,
        false as is_paid,
        NULL as paid_date
      FROM drivers d
      LEFT JOIN trucks t ON d.id = t.driver_id
      LEFT JOIN transport_trips tt ON d.id = tt.driver_id
        AND tt.trip_date BETWEEN $1::date AND $2::date
      WHERE d.is_active = true
      GROUP BY d.id, d.name, t.plate_no
      HAVING COALESCE(SUM(tt.driver_payment), 0) > 0
      ORDER BY weekly_pay DESC
    `, [week_start, week_end]);
    
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error fetching driver payroll:', err);
    next(err);
  }
});

router.post('/generate-driver/:week/:year', async (req, res, next) => {
  const client = await pool.connect();
  
  try {
    const { week, year } = req.params;
    const { week_start, week_end } = getWeekDates(parseInt(week), parseInt(year));
    
    await client.query('BEGIN');
    
    await client.query(
      'DELETE FROM weekly_driver_payroll WHERE week_number = $1 AND year = $2',
      [week, year]
    );
    
    const result = await client.query(`
      INSERT INTO weekly_driver_payroll (
        driver_id, week_start, week_end, week_number, year,
        total_trips, total_tons, total_payable,
        generated_at
      )
      SELECT 
        tt.driver_id,
        $1::date as week_start,
        $2::date as week_end,
        $3 as week_number,
        $4 as year,
        COUNT(DISTINCT tt.id) as total_trips,
        COALESCE(SUM(tt.tons_transported), 0) as total_tons,
        COALESCE(SUM(tt.driver_payment), 0) as total_payable,
        CURRENT_TIMESTAMP
      FROM transport_trips tt
      WHERE tt.trip_date BETWEEN $1::date AND $2::date
      GROUP BY tt.driver_id
    `, [week_start, week_end, week, year]);
    
    await client.query('COMMIT');
    
    res.json({ 
      success: true, 
      message: `Driver payroll generated for week ${week}, ${year}`,
      count: result.rowCount
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error generating driver payroll:', err);
    next(err);
  } finally {
    client.release();
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
    console.error('Error marking driver payroll as paid:', err);
    next(err);
  }
});

module.exports = router;
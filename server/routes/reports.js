const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');

// Helper: Get week dates from week number and year (Friday to Thursday)
function getWeekDates(week, year) {
  const firstThursday = new Date(year, 0, 1);
  while (firstThursday.getDay() !== 4) {
    firstThursday.setDate(firstThursday.getDate() + 1);
  }
  const weekStart = new Date(firstThursday);
  weekStart.setDate(firstThursday.getDate() + (week - 1) * 7 - 1);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  return { week_start: weekStart, week_end: weekEnd };
}

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

// ============ SIMPLE WORKING DAILY RETURNS ============
router.get('/daily-working', async (req, res) => {
  try {
    const { date } = req.query;
    const targetDate = date || new Date().toISOString().split('T')[0];
    
    console.log('Daily Returns Request for:', targetDate);
    
    // Get all harvest assignments for the date
    const harvestResult = await pool.query(`
      SELECT 
        ha.id,
        ha.assignment_date,
        h.name as headman_name,
        o.name as outgrower_name,
        o.field_code,
        ha.turnup,
        ha.expected_tonnage,
        ha.status
      FROM harvest_assignments ha
      LEFT JOIN headmen h ON ha.headman_id = h.id
      LEFT JOIN outgrowers o ON ha.outgrower_id = o.id
      WHERE ha.assignment_date = $1::date
      ORDER BY ha.id DESC
    `, [targetDate]);
    
    // Get all loading records for the date
    const loadingResult = await pool.query(`
      SELECT 
        lr.id,
        lr.load_date,
        w.name as weighbridge_name,
        s.name as supervisor_name,
        lr.tons_loaded,
        lr.trip_count,
        o.name as outgrower_name,
        o.field_code
      FROM loading_records lr
      LEFT JOIN harvest_assignments ha ON lr.assignment_id = ha.id
      LEFT JOIN outgrowers o ON ha.outgrower_id = o.id
      LEFT JOIN weighbridges w ON lr.weighbridge_id = w.id
      LEFT JOIN supervisors s ON lr.supervisor_id = s.id
      WHERE lr.load_date = $1::date
      ORDER BY lr.id DESC
    `, [targetDate]);
    
    // Get all transport trips for the date
    const transportResult = await pool.query(`
      SELECT 
        tt.id,
        tt.trip_date,
        t.plate_no,
        d.name as driver_name,
        o.name as outgrower_name,
        db.band_code,
        tt.tons_transported,
        tt.total_revenue
      FROM transport_trips tt
      LEFT JOIN trucks t ON tt.truck_id = t.id
      LEFT JOIN drivers d ON tt.driver_id = d.id
      LEFT JOIN outgrowers o ON tt.outgrower_id = o.id
      LEFT JOIN distance_bands db ON tt.distance_band_id = db.id
      WHERE tt.trip_date = $1::date
      ORDER BY tt.id DESC
    `, [targetDate]);
    
    // Calculate totals
    let harvestTotal = 0;
    for (const h of harvestResult.rows) {
      harvestTotal += parseFloat(h.expected_tonnage) || 0;
    }
    
    let loadingTotal = 0;
    for (const l of loadingResult.rows) {
      loadingTotal += parseFloat(l.tons_loaded) || 0;
    }
    
    let transportTotal = 0;
    let transportRevenue = 0;
    for (const t of transportResult.rows) {
      transportTotal += parseFloat(t.tons_transported) || 0;
      transportRevenue += parseFloat(t.total_revenue) || 0;
    }
    
    const harvestRevenue = harvestTotal * 300;
    const loadingRevenue = loadingTotal * 150;
    const totalRevenue = harvestRevenue + loadingRevenue + transportRevenue;
    
    res.json({ 
      success: true, 
      data: {
        date: targetDate,
        harvests: harvestResult.rows,
        loadings: loadingResult.rows,
        transports: transportResult.rows,
        harvest_count: harvestResult.rows.length,
        loading_count: loadingResult.rows.length,
        transport_count: transportResult.rows.length,
        harvest_total: harvestTotal,
        loading_total: loadingTotal,
        transport_total: transportTotal,
        harvest_revenue: harvestRevenue,
        loading_revenue: loadingRevenue,
        transport_revenue: transportRevenue,
        total_revenue: totalRevenue
      }
    });
  } catch (err) {
    console.error('Error in daily-working:', err);
    res.status(500).json({ success: false, message: err.message, data: null });
  }
});

// ============ HEADMAN PERFORMANCE ============
router.get('/headman-performance', async (req, res) => {
  try {
    const { week, year } = req.query;
    
    let targetWeek = week;
    let targetYear = year;
    
    if (!targetWeek || !targetYear) {
      const today = new Date();
      targetWeek = getWeekNumber(today);
      targetYear = today.getFullYear();
    }
    
    const { week_start, week_end } = getWeekDates(parseInt(targetWeek), parseInt(targetYear));
    
    const result = await pool.query(`
      SELECT 
        ROW_NUMBER() OVER (ORDER BY 
          CASE 
            WHEN COALESCE(SUM(hawt.actual_tonnage), 0) = 0 THEN 0
            ELSE (COALESCE(SUM(hawt.actual_tonnage), 0) / NULLIF(COALESCE(SUM(ha.expected_tonnage), 0), 0)) * 100
          END DESC
        ) as rank,
        h.id as headman_id,
        h.name as headman_name,
        COALESCE(s.name, 'No Supervisor') as supervisor_name,
        COALESCE(SUM(ha.expected_tonnage), 0) as expected_tons,
        COALESCE(SUM(hawt.actual_tonnage), 0) as actual_tons,
        COALESCE(SUM(hawt.actual_tonnage - ha.expected_tonnage), 0) as tonnage_diff,
        CASE 
          WHEN COALESCE(SUM(ha.expected_tonnage), 0) > 0 
          THEN (COALESCE(SUM(hawt.actual_tonnage), 0) / NULLIF(COALESCE(SUM(ha.expected_tonnage), 0), 0)) * 100
          ELSE 0
        END as performance_percentage,
        COALESCE(SUM((hawt.actual_tonnage * 300) - (ha.turnup * 500)), 0) * 0.4 as weekly_pay,
        COUNT(DISTINCT ha.id) as assignments_count
      FROM headmen h
      LEFT JOIN harvest_assignments ha ON h.id = ha.headman_id 
        AND ha.assignment_date BETWEEN $1::date AND $2::date
        AND ha.manually_completed = true
      LEFT JOIN harvest_assignments_with_totals hawt ON ha.id = hawt.id
      LEFT JOIN supervisors s ON h.supervisor_id = s.id
      WHERE h.is_active = true
      GROUP BY h.id, h.name, s.name
      ORDER BY performance_percentage DESC
    `, [week_start, week_end]);
    
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error fetching headman performance:', err);
    res.status(500).json({ success: false, message: err.message, data: [] });
  }
});

// ============ SUPERVISOR PERFORMANCE ============
router.get('/supervisor-performance', async (req, res) => {
  try {
    const { week, year } = req.query;
    
    let targetWeek = week;
    let targetYear = year;
    
    if (!targetWeek || !targetYear) {
      const today = new Date();
      targetWeek = getWeekNumber(today);
      targetYear = today.getFullYear();
    }
    
    const { week_start, week_end } = getWeekDates(parseInt(targetWeek), parseInt(targetYear));
    
    const result = await pool.query(`
      SELECT 
        ROW_NUMBER() OVER (ORDER BY COUNT(DISTINCT lr.id) DESC) as rank,
        s.id as supervisor_id,
        s.name as supervisor_name,
        COUNT(DISTINCT lr.id) as total_trips,
        COALESCE(SUM(lr.tons_loaded), 0) as total_tons,
        COUNT(DISTINCT lr.id) * 100 as weekly_pay,
        COUNT(DISTINCT ha.id) as assignments_supervised
      FROM supervisors s
      LEFT JOIN loading_records lr ON s.id = lr.supervisor_id
        AND lr.load_date BETWEEN $1::date AND $2::date
      LEFT JOIN harvest_assignments ha ON lr.assignment_id = ha.id
        AND ha.manually_completed = true
      WHERE s.is_active = true
      GROUP BY s.id, s.name
      HAVING COUNT(DISTINCT lr.id) > 0
      ORDER BY total_tons DESC
    `, [week_start, week_end]);
    
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error fetching supervisor performance:', err);
    res.status(500).json({ success: false, message: err.message, data: [] });
  }
});

// ============ DRIVER PERFORMANCE ============
router.get('/driver-performance', async (req, res) => {
  try {
    const { week, year } = req.query;
    
    let targetWeek = week;
    let targetYear = year;
    
    if (!targetWeek || !targetYear) {
      const today = new Date();
      targetWeek = getWeekNumber(today);
      targetYear = today.getFullYear();
    }
    
    const { week_start, week_end } = getWeekDates(parseInt(targetWeek), parseInt(targetYear));
    
    const result = await pool.query(`
      SELECT 
        ROW_NUMBER() OVER (ORDER BY COALESCE(SUM(tt.driver_payment), 0) DESC) as rank,
        d.id as driver_id,
        d.name as driver_name,
        t.plate_no as truck_plate,
        COUNT(DISTINCT tt.id) as total_trips,
        COALESCE(SUM(tt.tons_transported), 0) as total_tons,
        COALESCE(SUM(tt.driver_payment), 0) as weekly_pay
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
    console.error('Error fetching driver performance:', err);
    res.status(500).json({ success: false, message: err.message, data: [] });
  }
});

// ============ WEEKLY RETURNS ============
router.get('/weekly-returns', async (req, res) => {
  try {
    const { week, year } = req.query;
    const { week_start, week_end } = getWeekDates(parseInt(week), parseInt(year));
    
    const result = await pool.query(`
      SELECT 
        COALESCE(SUM(hawt.actual_tonnage * 300), 0) as harvest_revenue,
        COALESCE(SUM(ha.turnup * 500), 0) as harvest_costs,
        COALESCE(SUM(lr.tons_loaded * 150), 0) as loading_revenue,
        COALESCE(SUM(lr.tons_loaded * 120 + lr.trip_count * 100), 0) as loading_costs,
        COALESCE(SUM(tt.total_revenue), 0) as transport_revenue,
        COALESCE(SUM(tt.driver_payment), 0) as transport_costs,
        COALESCE(SUM(hawt.actual_tonnage), 0) as total_actual_tons,
        COALESCE(SUM(ha.expected_tonnage), 0) as total_expected_tons
      FROM harvest_assignments ha
      LEFT JOIN harvest_assignments_with_totals hawt ON ha.id = hawt.id
      LEFT JOIN loading_records lr ON ha.id = lr.assignment_id AND lr.load_date BETWEEN $1 AND $2
      LEFT JOIN transport_trips tt ON ha.outgrower_id = tt.outgrower_id AND tt.trip_date BETWEEN $1 AND $2
      WHERE ha.assignment_date BETWEEN $1 AND $2
        AND ha.manually_completed = true
    `, [week_start, week_end]);
    
    const data = result.rows[0];
    data.week_start = week_start;
    data.week_end = week_end;
    data.week_number = parseInt(week);
    data.year = parseInt(year);
    data.total_revenue = (data.harvest_revenue || 0) + (data.loading_revenue || 0) + (data.transport_revenue || 0);
    data.total_costs = (data.harvest_costs || 0) + (data.loading_costs || 0) + (data.transport_costs || 0);
    data.total_sagib_net = data.total_revenue - data.total_costs;
    
    res.json({ success: true, data });
  } catch (err) {
    console.error('Error fetching weekly returns:', err);
    res.status(500).json({ success: false, message: err.message, data: null });
  }
});

// ============ COMPANY SUMMARY ============
router.get('/company-summary', async (req, res) => {
  try {
    const { week, year } = req.query;
    const { week_start, week_end } = getWeekDates(parseInt(week), parseInt(year));
    
    const result = await pool.query(`
      SELECT 
        COALESCE(SUM(hawt.actual_tonnage * 300), 0) as harvest_revenue,
        COALESCE(SUM(lr.tons_loaded * 150), 0) as loading_revenue,
        COALESCE(SUM(tt.total_revenue), 0) as transport_revenue,
        COALESCE(SUM(ha.turnup * 500), 0) as harvest_costs,
        COALESCE(SUM(lr.tons_loaded * 120 + lr.trip_count * 100), 0) as loading_costs,
        COALESCE(SUM(tt.driver_payment), 0) as transport_costs,
        COALESCE(SUM(hawt.actual_tonnage), 0) as actual_tons,
        COALESCE(SUM(ha.expected_tonnage), 0) as expected_tons
      FROM harvest_assignments ha
      LEFT JOIN harvest_assignments_with_totals hawt ON ha.id = hawt.id
      LEFT JOIN loading_records lr ON ha.id = lr.assignment_id AND lr.load_date BETWEEN $1 AND $2
      LEFT JOIN transport_trips tt ON ha.outgrower_id = tt.outgrower_id AND tt.trip_date BETWEEN $1 AND $2
      WHERE ha.assignment_date BETWEEN $1 AND $2
        AND ha.manually_completed = true
    `, [week_start, week_end]);
    
    const data = result.rows[0];
    data.total_revenue = data.harvest_revenue + data.loading_revenue + data.transport_revenue;
    data.total_costs = data.harvest_costs + data.loading_costs + data.transport_costs;
    data.total_sagib_net = data.total_revenue - data.total_costs;
    
    res.json({ success: true, data });
  } catch (err) {
    console.error('Error fetching company summary:', err);
    res.status(500).json({ success: false, message: err.message, data: null });
  }
});

// ============ OUTGROWER WEEKLY PERFORMANCE ============
router.get('/outgrower-weekly', async (req, res) => {
  try {
    const { week, year } = req.query;
    
    let targetWeek = week;
    let targetYear = year;
    
    if (!targetWeek || !targetYear) {
      const today = new Date();
      targetWeek = getWeekNumber(today);
      targetYear = today.getFullYear();
    }
    
    const { week_start, week_end } = getWeekDates(parseInt(targetWeek), parseInt(targetYear));
    
    const result = await pool.query(`
      SELECT 
        o.id as outgrower_id,
        o.name as outgrower_name,
        o.field_code,
        COALESCE(SUM(hawt.actual_tonnage), 0) as total_harvest,
        COALESCE(SUM(lr.tons_loaded), 0) as total_loaded,
        COALESCE(SUM(tt.tons_transported), 0) as total_transported,
        COUNT(DISTINCT tt.id) as trips,
        COALESCE(SUM(hawt.actual_tonnage * 300), 0) as harvest_revenue,
        COALESCE(SUM(lr.tons_loaded * 150), 0) as loading_revenue,
        COALESCE(SUM(tt.total_revenue), 0) as transport_revenue,
        COALESCE(SUM(hawt.actual_tonnage * 300), 0) + 
        COALESCE(SUM(lr.tons_loaded * 150), 0) + 
        COALESCE(SUM(tt.total_revenue), 0) as total_revenue
      FROM outgrowers o
      LEFT JOIN harvest_assignments ha ON o.id = ha.outgrower_id 
        AND ha.assignment_date BETWEEN $1::date AND $2::date
        AND ha.manually_completed = true
      LEFT JOIN harvest_assignments_with_totals hawt ON ha.id = hawt.id
      LEFT JOIN loading_records lr ON ha.id = lr.assignment_id 
        AND lr.load_date BETWEEN $1::date AND $2::date
      LEFT JOIN transport_trips tt ON o.id = tt.outgrower_id 
        AND tt.trip_date BETWEEN $1::date AND $2::date
      WHERE o.is_active = true
      GROUP BY o.id, o.name, o.field_code
      ORDER BY total_revenue DESC
    `, [week_start, week_end]);
    
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error fetching outgrower weekly performance:', err);
    res.status(500).json({ success: false, message: err.message, data: [] });
  }
});

// ============ OUTGROWER DAILY PERFORMANCE ============
router.get('/outgrower-daily', async (req, res) => {
  try {
    const { date } = req.query;
    const targetDate = date || new Date().toISOString().split('T')[0];
    
    const result = await pool.query(`
      SELECT 
        o.id as outgrower_id,
        o.name as outgrower_name,
        o.field_code,
        COALESCE(SUM(hawt.actual_tonnage), 0) as total_harvest,
        COALESCE(SUM(lr.tons_loaded), 0) as total_loaded,
        COALESCE(SUM(tt.tons_transported), 0) as total_transported,
        COUNT(DISTINCT tt.id) as trips,
        COALESCE(SUM(hawt.actual_tonnage * 300), 0) as harvest_revenue,
        COALESCE(SUM(lr.tons_loaded * 150), 0) as loading_revenue,
        COALESCE(SUM(tt.total_revenue), 0) as transport_revenue,
        COALESCE(SUM(hawt.actual_tonnage * 300), 0) + 
        COALESCE(SUM(lr.tons_loaded * 150), 0) + 
        COALESCE(SUM(tt.total_revenue), 0) as total_revenue
      FROM outgrowers o
      LEFT JOIN harvest_assignments ha ON o.id = ha.outgrower_id 
        AND ha.assignment_date = $1::date
        AND ha.manually_completed = true
      LEFT JOIN harvest_assignments_with_totals hawt ON ha.id = hawt.id
      LEFT JOIN loading_records lr ON ha.id = lr.assignment_id 
        AND lr.load_date = $1::date
      LEFT JOIN transport_trips tt ON o.id = tt.outgrower_id 
        AND tt.trip_date = $1::date
      WHERE o.is_active = true
      GROUP BY o.id, o.name, o.field_code
      ORDER BY total_revenue DESC
    `, [targetDate]);
    
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error fetching outgrower daily performance:', err);
    res.status(500).json({ success: false, message: err.message, data: [] });
  }
});

// ============ OUTGROWER WEEKLY DETAILS ============
router.get('/outgrower-weekly-details', async (req, res) => {
  try {
    const { outgrower_id, week, year } = req.query;
    const { week_start, week_end } = getWeekDates(parseInt(week), parseInt(year));
    
    const result = await pool.query(`
      SELECT 
        o.name as outgrower_name,
        o.field_code,
        COALESCE(SUM(hawt.actual_tonnage), 0) as total_harvest,
        COALESCE(SUM(lr.tons_loaded), 0) as total_loaded,
        COALESCE(SUM(tt.tons_transported), 0) as total_transported,
        COUNT(DISTINCT tt.id) as trips,
        COALESCE(SUM(hawt.actual_tonnage * 300), 0) as harvest_revenue,
        COALESCE(SUM(lr.tons_loaded * 150), 0) as loading_revenue,
        COALESCE(SUM(tt.total_revenue), 0) as transport_revenue,
        COALESCE(SUM(hawt.actual_tonnage * 300), 0) + 
        COALESCE(SUM(lr.tons_loaded * 150), 0) + 
        COALESCE(SUM(tt.total_revenue), 0) as total_revenue
      FROM outgrowers o
      LEFT JOIN harvest_assignments ha ON o.id = ha.outgrower_id 
        AND ha.assignment_date BETWEEN $1::date AND $2::date
        AND ha.manually_completed = true
      LEFT JOIN harvest_assignments_with_totals hawt ON ha.id = hawt.id
      LEFT JOIN loading_records lr ON ha.id = lr.assignment_id 
        AND lr.load_date BETWEEN $1::date AND $2::date
      LEFT JOIN transport_trips tt ON o.id = tt.outgrower_id 
        AND tt.trip_date BETWEEN $1::date AND $2::date
      WHERE o.id = $3
      GROUP BY o.name, o.field_code
    `, [week_start, week_end, outgrower_id]);
    
    res.json({ success: true, data: result.rows[0] || null });
  } catch (err) {
    console.error('Error fetching outgrower weekly details:', err);
    res.status(500).json({ success: false, message: err.message, data: null });
  }
});

// ============ OUTGROWER DAILY DETAILS ============
router.get('/outgrower-daily-details', async (req, res) => {
  try {
    const { outgrower_id, week, year } = req.query;
    const { week_start, week_end } = getWeekDates(parseInt(week), parseInt(year));
    
    const result = await pool.query(`
      SELECT 
        ha.assignment_date as date,
        COALESCE(SUM(hawt.actual_tonnage), 0) as harvested,
        COALESCE(SUM(lr.tons_loaded), 0) as loaded,
        COALESCE(SUM(tt.tons_transported), 0) as transported,
        COUNT(DISTINCT tt.id) as trips,
        COALESCE(SUM(hawt.actual_tonnage * 300), 0) + 
        COALESCE(SUM(lr.tons_loaded * 150), 0) + 
        COALESCE(SUM(tt.total_revenue), 0) as revenue
      FROM harvest_assignments ha
      LEFT JOIN harvest_assignments_with_totals hawt ON ha.id = hawt.id
      LEFT JOIN loading_records lr ON ha.id = lr.assignment_id 
        AND lr.load_date = ha.assignment_date
      LEFT JOIN transport_trips tt ON ha.outgrower_id = tt.outgrower_id 
        AND tt.trip_date = ha.assignment_date
      WHERE ha.outgrower_id = $1
        AND ha.assignment_date BETWEEN $2::date AND $3::date
        AND ha.manually_completed = true
      GROUP BY ha.assignment_date
      ORDER BY ha.assignment_date
    `, [outgrower_id, week_start, week_end]);
    
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error fetching outgrower daily details:', err);
    res.status(500).json({ success: false, message: err.message, data: [] });
  }
});
// ============ GET AVAILABLE DATES ============
router.get('/available-dates', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT DISTINCT assignment_date as date FROM harvest_assignments WHERE assignment_date IS NOT NULL
      UNION
      SELECT DISTINCT load_date as date FROM loading_records WHERE load_date IS NOT NULL
      UNION
      SELECT DISTINCT trip_date as date FROM transport_trips WHERE trip_date IS NOT NULL
      ORDER BY date DESC
    `);
    
    const dates = result.rows.map(row => row.date.toISOString().split('T')[0]);
    res.json({ success: true, data: dates });
  } catch (err) {
    console.error('Error fetching available dates:', err);
    res.status(500).json({ success: false, message: err.message, data: [] });
  }
});
module.exports = router;
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

// Get current week
router.get('/current-week', async (req, res, next) => {
  try {
    const today = new Date();
    const weekNum = getWeekNumber(today);
    const { week_start, week_end } = getWeekDates(weekNum, today.getFullYear());
    res.json({ 
      success: true, 
      data: {
        week_number: weekNum,
        year: today.getFullYear(),
        week_start: week_start,
        week_end: week_end
      }
    });
  } catch (err) {
    console.error('Error getting current week:', err);
    next(err);
  }
});

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

// Daily Returns - Show all data, not just completed
router.get('/daily-returns', async (req, res, next) => {
  try {
    const { date } = req.query;
    const targetDate = date || new Date().toISOString().split('T')[0];
    
    const result = await pool.query(`
      SELECT 
        COALESCE(SUM(hawt.actual_tonnage * 300), 0) as harvest_revenue,
        COALESCE(SUM(lr.tons_loaded * 150), 0) as loading_revenue,
        COALESCE(SUM(tt.total_revenue), 0) as transport_revenue,
        COALESCE(SUM(hawt.actual_tonnage * 300), 0) + 
        COALESCE(SUM(lr.tons_loaded * 150), 0) + 
        COALESCE(SUM(tt.total_revenue), 0) as total_revenue,
        COALESCE(SUM(ha.turnup * 500), 0) as harvest_costs,
        COALESCE(SUM(lr.tons_loaded * 120 + lr.trip_count * 100), 0) as loading_costs,
        COALESCE(SUM(tt.driver_payment), 0) as transport_costs,
        COALESCE(SUM(hawt.actual_tonnage * 300), 0) - COALESCE(SUM(ha.turnup * 500), 0) + 
        COALESCE(SUM(lr.tons_loaded * 150), 0) - COALESCE(SUM(lr.tons_loaded * 120 + lr.trip_count * 100), 0) + 
        COALESCE(SUM(tt.total_revenue - tt.driver_payment), 0) as sagib_net
      FROM harvest_assignments ha
      LEFT JOIN harvest_assignments_with_totals hawt ON ha.id = hawt.id
      LEFT JOIN loading_records lr ON ha.id = lr.assignment_id AND lr.load_date = $1
      LEFT JOIN transport_trips tt ON ha.outgrower_id = tt.outgrower_id AND tt.trip_date = $1
      WHERE ha.assignment_date = $1
    `, [targetDate]);
    
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Error fetching daily returns:', err);
    next(err);
  }
});

// Weekly Returns - Show all data
router.get('/weekly-returns', async (req, res, next) => {
  try {
    const { week, year } = req.query;
    const { week_start, week_end } = getWeekDates(parseInt(week), parseInt(year));
    
    const result = await pool.query(`
      SELECT 
        COALESCE(SUM(hawt.actual_tonnage * 300), 0) as harvest_revenue,
        COALESCE(SUM(ha.turnup * 500), 0) as harvest_costs,
        COALESCE(SUM(hawt.actual_tonnage * 300) - SUM(ha.turnup * 500), 0) as harvest_gross_profit,
        COALESCE(SUM(hawt.actual_tonnage * 300) - SUM(ha.turnup * 500), 0) * 0.6 as harvest_sagib_net,
        COALESCE(SUM(lr.tons_loaded * 150), 0) as loading_revenue,
        COALESCE(SUM(lr.tons_loaded * 120 + lr.trip_count * 100), 0) as loading_costs,
        COALESCE(SUM(lr.tons_loaded * 150) - SUM(lr.tons_loaded * 120 + lr.trip_count * 100), 0) as loading_gross_profit,
        COALESCE(SUM(lr.tons_loaded * 150) - SUM(lr.tons_loaded * 120 + lr.trip_count * 100), 0) as loading_sagib_net,
        COALESCE(SUM(tt.total_revenue), 0) as transport_revenue,
        COALESCE(SUM(tt.driver_payment), 0) as transport_costs,
        COALESCE(SUM(tt.sagib_retention), 0) as transport_sagib_net,
        COALESCE(SUM(hawt.actual_tonnage * 300), 0) + 
        COALESCE(SUM(lr.tons_loaded * 150), 0) + 
        COALESCE(SUM(tt.total_revenue), 0) as total_revenue,
        COALESCE(SUM(ha.turnup * 500), 0) + 
        COALESCE(SUM(lr.tons_loaded * 120 + lr.trip_count * 100), 0) + 
        COALESCE(SUM(tt.driver_payment), 0) as total_costs,
        COALESCE(SUM(hawt.actual_tonnage * 300) - SUM(ha.turnup * 500), 0) * 0.6 + 
        COALESCE(SUM(lr.tons_loaded * 150) - SUM(lr.tons_loaded * 120 + lr.trip_count * 100), 0) + 
        COALESCE(SUM(tt.sagib_retention), 0) as total_sagib_net,
        COALESCE(SUM(ha.expected_tonnage), 0) as total_expected_tons,
        COALESCE(SUM(hawt.actual_tonnage), 0) as total_actual_tons
      FROM harvest_assignments ha
      LEFT JOIN harvest_assignments_with_totals hawt ON ha.id = hawt.id
      LEFT JOIN loading_records lr ON ha.id = lr.assignment_id AND lr.load_date BETWEEN $1 AND $2
      LEFT JOIN transport_trips tt ON ha.outgrower_id = tt.outgrower_id AND tt.trip_date BETWEEN $1 AND $2
      WHERE ha.assignment_date BETWEEN $1 AND $2
    `, [week_start, week_end]);
    
    const data = result.rows[0];
    data.week_start = week_start;
    data.week_end = week_end;
    data.week_number = parseInt(week);
    data.year = parseInt(year);
    
    res.json({ success: true, data });
  } catch (err) {
    console.error('Error fetching weekly returns:', err);
    next(err);
  }
});

// Headman Performance - Show all headmen with data
router.get('/headman-performance', async (req, res, next) => {
  try {
    const { week, year } = req.query;
    const { week_start, week_end } = getWeekDates(parseInt(week), parseInt(year));
    
    const result = await pool.query(`
      SELECT 
        h.id as headman_id,
        h.name as headman_name,
        s.name as supervisor_name,
        COALESCE(SUM(ha.expected_tonnage), 0) as expected_tons,
        COALESCE(SUM(hawt.actual_tonnage), 0) as actual_tons,
        COALESCE(SUM(hawt.actual_tonnage - ha.expected_tonnage), 0) as tonnage_diff,
        CASE 
          WHEN COALESCE(SUM(ha.expected_tonnage), 0) > 0 
          THEN (COALESCE(SUM(hawt.actual_tonnage), 0) / COALESCE(SUM(ha.expected_tonnage), 1)) * 100
          ELSE 0
        END as performance_percentage,
        COALESCE(SUM((hawt.actual_tonnage * 300 - ha.turnup * 500) * 0.4), 0) as harvest_payment,
        COALESCE(SUM((lr.tons_loaded * 150 - lr.tons_loaded * 120 - lr.trip_count * 100) * 0.4), 0) as loading_payment,
        COALESCE(SUM((hawt.actual_tonnage * 300 - ha.turnup * 500) * 0.4), 0) + 
        COALESCE(SUM((lr.tons_loaded * 150 - lr.tons_loaded * 120 - lr.trip_count * 100) * 0.4), 0) as total_payment,
        COUNT(DISTINCT ha.id) as assignments_count
      FROM headmen h
      LEFT JOIN harvest_assignments ha ON h.id = ha.headman_id 
        AND ha.assignment_date BETWEEN $1 AND $2
      LEFT JOIN harvest_assignments_with_totals hawt ON ha.id = hawt.id
      LEFT JOIN loading_records lr ON ha.id = lr.assignment_id AND lr.load_date BETWEEN $1 AND $2
      LEFT JOIN supervisors s ON h.supervisor_id = s.id
      WHERE h.is_active = true
      GROUP BY h.id, h.name, s.name
      ORDER BY performance_percentage DESC
    `, [week_start, week_end]);
    
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error fetching headman performance:', err);
    next(err);
  }
});

// Supervisor Performance
router.get('/supervisor-performance', async (req, res, next) => {
  try {
    const { week, year } = req.query;
    const { week_start, week_end } = getWeekDates(parseInt(week), parseInt(year));
    
    const result = await pool.query(`
      SELECT 
        s.id as supervisor_id,
        s.name as supervisor_name,
        COUNT(DISTINCT lr.id) as total_trips,
        COALESCE(SUM(lr.tons_loaded), 0) as total_tons,
        COUNT(DISTINCT lr.id) * 100 as weekly_pay,
        COUNT(DISTINCT ha.id) as assignments_supervised
      FROM supervisors s
      LEFT JOIN loading_records lr ON s.id = lr.supervisor_id
        AND lr.load_date BETWEEN $1 AND $2
      LEFT JOIN harvest_assignments ha ON lr.assignment_id = ha.id
      WHERE s.is_active = true
      GROUP BY s.id, s.name
      ORDER BY total_tons DESC
    `, [week_start, week_end]);
    
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error fetching supervisor performance:', err);
    next(err);
  }
});

// Driver Performance
router.get('/driver-performance', async (req, res, next) => {
  try {
    const { week, year } = req.query;
    const { week_start, week_end } = getWeekDates(parseInt(week), parseInt(year));
    
    const result = await pool.query(`
      SELECT 
        d.id as driver_id,
        d.name as driver_name,
        t.plate_no as truck_plate,
        COUNT(DISTINCT tt.id) as total_trips,
        COALESCE(SUM(tt.tons_transported), 0) as total_tons,
        COALESCE(SUM(tt.driver_payment), 0) as weekly_pay
      FROM drivers d
      LEFT JOIN trucks t ON d.id = t.driver_id
      LEFT JOIN transport_trips tt ON d.id = tt.driver_id
        AND tt.trip_date BETWEEN $1 AND $2
      WHERE d.is_active = true
      GROUP BY d.id, d.name, t.plate_no
      ORDER BY total_tons DESC
    `, [week_start, week_end]);
    
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error fetching driver performance:', err);
    next(err);
  }
});

// Company Summary
router.get('/company-summary', async (req, res, next) => {
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
        COALESCE(SUM((hawt.actual_tonnage * 300 - ha.turnup * 500) * 0.4), 0) as headman_payments,
        COALESCE(SUM(lr.trip_count * 100), 0) as supervisor_payments,
        COALESCE(SUM(tt.driver_payment), 0) as driver_payments,
        COALESCE(SUM(hawt.actual_tonnage * 300 - ha.turnup * 500), 0) * 0.6 + 
        COALESCE(SUM(lr.tons_loaded * 150 - lr.tons_loaded * 120 - lr.trip_count * 100), 0) + 
        COALESCE(SUM(tt.sagib_retention), 0) as sagib_net,
        COALESCE(SUM(ha.expected_tonnage), 0) as expected_tons,
        COALESCE(SUM(hawt.actual_tonnage), 0) as actual_tons
      FROM harvest_assignments ha
      LEFT JOIN harvest_assignments_with_totals hawt ON ha.id = hawt.id
      LEFT JOIN loading_records lr ON ha.id = lr.assignment_id AND lr.load_date BETWEEN $1 AND $2
      LEFT JOIN transport_trips tt ON ha.outgrower_id = tt.outgrower_id AND tt.trip_date BETWEEN $1 AND $2
      WHERE ha.assignment_date BETWEEN $1 AND $2
    `, [week_start, week_end]);
    
    const data = result.rows[0];
    data.week_start = week_start;
    data.week_end = week_end;
    data.week_number = parseInt(week);
    data.year = parseInt(year);
    
    res.json({ success: true, data });
  } catch (err) {
    console.error('Error fetching company summary:', err);
    next(err);
  }
});

// Headman Performance
router.get('/headman-performance', async (req, res, next) => {
  try {
    const { week, year } = req.query;
    
    // If no week/year provided, use current week
    let targetWeek = week;
    let targetYear = year;
    
    if (!targetWeek || !targetYear) {
      const today = new Date();
      targetWeek = getWeekNumber(today);
      targetYear = today.getFullYear();
    }
    
    const { week_start, week_end } = getWeekDates(parseInt(targetWeek), parseInt(targetYear));
    
    console.log(`Fetching headman performance for week ${targetWeek}, year ${targetYear}`);
    console.log(`Date range: ${week_start} to ${week_end}`);
    
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
        s.name as supervisor_name,
        COALESCE(SUM(ha.expected_tonnage), 0) as expected_tons,
        COALESCE(SUM(hawt.actual_tonnage), 0) as actual_tons,
        COALESCE(SUM(hawt.actual_tonnage - ha.expected_tonnage), 0) as tonnage_diff,
        CASE 
          WHEN COALESCE(SUM(ha.expected_tonnage), 0) > 0 
          THEN (COALESCE(SUM(hawt.actual_tonnage), 0) / COALESCE(SUM(ha.expected_tonnage), 1)) * 100
          ELSE 0
        END as performance_percentage,
        COALESCE(SUM((hawt.actual_tonnage * 300) - (ha.turnup * 500)), 0) * 0.4 as harvest_payment,
        COALESCE(SUM((lr.tons_loaded * 30) - (lr.trip_count * 100)), 0) * 0.4 as loading_payment,
        COALESCE(
          (COALESCE(SUM((hawt.actual_tonnage * 300) - (ha.turnup * 500)), 0) * 0.4) +
          (COALESCE(SUM((lr.tons_loaded * 30) - (lr.trip_count * 100)), 0) * 0.4), 
          0
        ) as weekly_pay,
        COUNT(DISTINCT ha.id) as assignments_count
      FROM headmen h
      LEFT JOIN harvest_assignments ha ON h.id = ha.headman_id 
        AND ha.assignment_date BETWEEN $1::date AND $2::date
      LEFT JOIN harvest_assignments_with_totals hawt ON ha.id = hawt.id
      LEFT JOIN loading_records lr ON ha.id = lr.assignment_id 
        AND lr.load_date BETWEEN $1::date AND $2::date
      LEFT JOIN supervisors s ON h.supervisor_id = s.id
      WHERE h.is_active = true
      GROUP BY h.id, h.name, s.name
      ORDER BY performance_percentage DESC
    `, [week_start, week_end]);
    
    console.log(`Found ${result.rows.length} headmen with performance data`);
    
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error fetching headman performance:', err);
    next(err);
  }
});
module.exports = router;
const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');

// Helper: Get week dates
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

// ============ HEADMAN PERFORMANCE - SIMPLE WORKING VERSION ============
router.get('/headman-performance', async (req, res) => {
  try {
    const { week, year } = req.query;
    
    // Use current week if not provided
    let targetWeek = week || getWeekNumber(new Date());
    let targetYear = year || new Date().getFullYear();
    
    const { week_start, week_end } = getWeekDates(parseInt(targetWeek), parseInt(targetYear));
    
    console.log('Headman Performance Query - Week:', targetWeek, 'Year:', targetYear);
    console.log('Date range:', week_start, 'to', week_end);
    
    // Simple query - get all headmen with their harvest totals
    const result = await pool.query(`
      SELECT 
        h.id as headman_id,
        h.name as headman_name,
        COALESCE(s.name, 'No Supervisor') as supervisor_name,
        COALESCE(SUM(ha.expected_tonnage), 0) as expected_tons,
        COALESCE(SUM(hawt.actual_tonnage), 0) as actual_tons,
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
      LEFT JOIN harvest_assignments_with_totals hawt ON ha.id = hawt.id
      LEFT JOIN supervisors s ON h.supervisor_id = s.id
      WHERE h.is_active = true
      GROUP BY h.id, h.name, s.name
      ORDER BY performance_percentage DESC
    `, [week_start, week_end]);
    
    console.log('Found headmen:', result.rows.length);
    
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Headman Performance Error:', err);
    res.status(500).json({ success: false, message: err.message, data: [] });
  }
});

// ============ SUPERVISOR PERFORMANCE ============
router.get('/supervisor-performance', async (req, res) => {
  try {
    const { week, year } = req.query;
    let targetWeek = week || getWeekNumber(new Date());
    let targetYear = year || new Date().getFullYear();
    const { week_start, week_end } = getWeekDates(parseInt(targetWeek), parseInt(targetYear));
    
    const result = await pool.query(`
      SELECT 
        ROW_NUMBER() OVER (ORDER BY COUNT(DISTINCT lr.id) DESC) as rank,
        s.id as supervisor_id,
        s.name as supervisor_name,
        COUNT(DISTINCT lr.id) as total_trips,
        COALESCE(SUM(lr.tons_loaded), 0) as total_tons,
        COUNT(DISTINCT lr.id) * 100 as weekly_pay
      FROM supervisors s
      LEFT JOIN loading_records lr ON s.id = lr.supervisor_id
        AND lr.load_date BETWEEN $1::date AND $2::date
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
    let targetWeek = week || getWeekNumber(new Date());
    let targetYear = year || new Date().getFullYear();
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

// ============ DAILY RETURNS ============
router.get('/daily-returns', async (req, res) => {
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
        COALESCE(SUM(tt.total_revenue), 0) as total_revenue
      FROM harvest_assignments ha
      LEFT JOIN harvest_assignments_with_totals hawt ON ha.id = hawt.id
      LEFT JOIN loading_records lr ON ha.id = lr.assignment_id AND lr.load_date = $1
      LEFT JOIN transport_trips tt ON ha.outgrower_id = tt.outgrower_id AND tt.trip_date = $1
      WHERE ha.assignment_date = $1
        AND ha.manually_completed = true
    `, [targetDate]);
    
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Error fetching daily returns:', err);
    res.status(500).json({ success: false, message: err.message, data: null });
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
        COALESCE(SUM(lr.tons_loaded * 150), 0) as loading_revenue,
        COALESCE(SUM(tt.total_revenue), 0) as transport_revenue,
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
    
    res.json({ success: true, data });
  } catch (err) {
    console.error('Error fetching company summary:', err);
    res.status(500).json({ success: false, message: err.message, data: null });
  }
});

module.exports = router;
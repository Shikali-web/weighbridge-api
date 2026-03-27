const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');

// Generate weekly summary for a given week
router.post('/generate/:week/:year', async (req, res, next) => {
  const client = await pool.connect();
  
  try {
    const { week, year } = req.params;
    
    // Calculate week start and end dates
    const startDate = getWeekStartDate(week, year);
    const endDate = getWeekEndDate(week, year);
    
    // Get Harvest Summary
    const harvestSummary = await client.query(`
      SELECT 
        COALESCE(SUM(hf.factory_revenue), 0) as factory_revenue,
        COALESCE(SUM(hf.cutter_payment), 0) as cutter_cost,
        COALESCE(SUM(hf.gross_profit), 0) as gross_profit,
        COALESCE(SUM(hf.final_headman_payment), 0) as headman_payment,
        COALESCE(SUM(hf.final_sagib_net), 0) as sagib_net,
        COALESCE(SUM(ha.actual_tonnage), 0) as total_tons
      FROM harvest_financials hf
      JOIN harvest_assignments ha ON hf.assignment_id = ha.id
      WHERE hf.week_number = $1 AND hf.year = $2
    `, [week, year]);
    
    // Get Loading Summary
    const loadingSummary = await client.query(`
      SELECT 
        COALESCE(SUM(lf.factory_revenue), 0) as factory_revenue,
        COALESCE(SUM(lf.loader_payment), 0) as loader_cost,
        COALESCE(SUM(lf.supervisor_payment), 0) as supervisor_cost,
        COALESCE(SUM(lf.gross_profit), 0) as gross_profit,
        COALESCE(SUM(lf.final_sagib_net), 0) as sagib_net,
        COALESCE(SUM(lr.tons_loaded), 0) as total_tons
      FROM loading_financials lf
      JOIN loading_records lr ON lf.loading_record_id = lr.id
      WHERE lf.week_number = $1 AND lf.year = $2
    `, [week, year]);
    
    // Get Transport Summary
    const transportSummary = await client.query(`
      SELECT 
        COALESCE(SUM(total_revenue), 0) as revenue,
        COALESCE(SUM(driver_payment), 0) as driver_cost,
        COALESCE(SUM(sagib_retention), 0) as sagib_net,
        COALESCE(SUM(tons_transported), 0) as total_tons
      FROM transport_trips
      WHERE week_number = $1 AND year = $2
    `, [week, year]);
    
    const harvest = harvestSummary.rows[0];
    const loading = loadingSummary.rows[0];
    const transport = transportSummary.rows[0];
    
    // Calculate totals
    const total_revenue = harvest.factory_revenue + loading.factory_revenue + transport.revenue;
    const total_costs = harvest.cutter_cost + loading.loader_cost + loading.supervisor_cost + transport.driver_cost;
    const total_sagib_net = harvest.sagib_net + loading.sagib_net + transport.sagib_net;
    
    // Insert or update weekly summary
    await client.query(`
      INSERT INTO weekly_company_summary (
        week_start, week_end, week_number, year,
        harvest_factory_revenue, harvest_cutter_cost, harvest_gross_profit,
        harvest_headman_payment, harvest_sagib_net, harvest_total_tons,
        loading_factory_revenue, loading_loader_cost, loading_supervisor_cost,
        loading_gross_profit, loading_sagib_net, loading_total_tons,
        transport_revenue, transport_driver_cost, transport_sagib_net, transport_total_tons,
        total_revenue, total_costs, total_sagib_net
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
      ON CONFLICT (week_start, week_end) DO UPDATE SET
        harvest_factory_revenue = EXCLUDED.harvest_factory_revenue,
        harvest_cutter_cost = EXCLUDED.harvest_cutter_cost,
        harvest_gross_profit = EXCLUDED.harvest_gross_profit,
        harvest_headman_payment = EXCLUDED.harvest_headman_payment,
        harvest_sagib_net = EXCLUDED.harvest_sagib_net,
        harvest_total_tons = EXCLUDED.harvest_total_tons,
        loading_factory_revenue = EXCLUDED.loading_factory_revenue,
        loading_loader_cost = EXCLUDED.loading_loader_cost,
        loading_supervisor_cost = EXCLUDED.loading_supervisor_cost,
        loading_gross_profit = EXCLUDED.loading_gross_profit,
        loading_sagib_net = EXCLUDED.loading_sagib_net,
        loading_total_tons = EXCLUDED.loading_total_tons,
        transport_revenue = EXCLUDED.transport_revenue,
        transport_driver_cost = EXCLUDED.transport_driver_cost,
        transport_sagib_net = EXCLUDED.transport_sagib_net,
        transport_total_tons = EXCLUDED.transport_total_tons,
        total_revenue = EXCLUDED.total_revenue,
        total_costs = EXCLUDED.total_costs,
        total_sagib_net = EXCLUDED.total_sagib_net
    `, [
      startDate, endDate, week, year,
      harvest.factory_revenue, harvest.cutter_cost, harvest.gross_profit,
      harvest.headman_payment, harvest.sagib_net, harvest.total_tons,
      loading.factory_revenue, loading.loader_cost, loading.supervisor_cost,
      loading.gross_profit, loading.sagib_net, loading.total_tons,
      transport.revenue, transport.driver_cost, transport.sagib_net, transport.total_tons,
      total_revenue, total_costs, total_sagib_net
    ]);
    
    res.json({ success: true, message: 'Weekly summary generated successfully' });
  } catch (err) {
    console.error('Error generating weekly summary:', err);
    next(err);
  } finally {
    client.release();
  }
});

function getWeekStartDate(week, year) {
  const simple = new Date(year, 0, 1 + (week - 1) * 7);
  const dayOfWeek = simple.getDay();
  const monday = new Date(simple);
  monday.setDate(simple.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1));
  return monday;
}

function getWeekEndDate(week, year) {
  const start = getWeekStartDate(week, year);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return end;
}

module.exports = router;
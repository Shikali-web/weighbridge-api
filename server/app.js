const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const authRoutes = require('./routes/auth');
require('dotenv').config();

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));
app.use('/api/auth', authRoutes);

// Import routes
const weighbridges = require('./routes/weighbridges');
const distanceBands = require('./routes/distanceBands');
const rateConfig = require('./routes/rateConfig');
const supervisors = require('./routes/supervisors');
const headmen = require('./routes/headmen');
const drivers = require('./routes/drivers');
const trucks = require('./routes/trucks');
const outgrowers = require('./routes/outgrowers');
const harvestAssignments = require('./routes/harvestAssignments');
const harvestFinancials = require('./routes/harvestFinancials');
const loadingRecords = require('./routes/loadingRecords');
const loadingFinancials = require('./routes/loadingFinancials');
const transportTrips = require('./routes/transportTrips');
const payroll = require('./routes/payroll');
const weeklySummary = require('./routes/weeklySummary');
const reports = require('./routes/reports');

// Use routes
app.use('/api/weighbridges', weighbridges);
app.use('/api/distance-bands', distanceBands);
app.use('/api/rate-config', rateConfig);
app.use('/api/supervisors', supervisors);
app.use('/api/headmen', headmen);
app.use('/api/drivers', drivers);
app.use('/api/trucks', trucks);
app.use('/api/outgrowers', outgrowers);
app.use('/api/harvest-assignments', harvestAssignments);
app.use('/api/harvest-financials', harvestFinancials);
app.use('/api/loading-records', loadingRecords);
app.use('/api/loading-financials', loadingFinancials);
app.use('/api/transport-trips', transportTrips);
app.use('/api/payroll', payroll);
app.use('/api/weekly-summary', weeklySummary);
app.use('/api/reports', reports);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Server is running' });
});

// Error handling middleware
const errorHandler = require('./middleware/errorHandler');
app.use(errorHandler);

module.exports = app;
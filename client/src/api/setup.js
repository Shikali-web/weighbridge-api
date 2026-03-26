import apiClient from './client';

// Weighbridges
export const getWeighbridges = (search) => apiClient.get('/weighbridges', { params: { search } });
export const createWeighbridge = (data) => apiClient.post('/weighbridges', data);
export const updateWeighbridge = (id, data) => apiClient.put(`/weighbridges/${id}`, data);
export const deleteWeighbridge = (id) => apiClient.delete(`/weighbridges/${id}`);

// Distance Bands
export const getDistanceBands = (search) => apiClient.get('/distance-bands', { params: { search } });
export const createDistanceBand = (data) => apiClient.post('/distance-bands', data);
export const updateDistanceBand = (id, data) => apiClient.put(`/distance-bands/${id}`, data);
export const deleteDistanceBand = (id) => apiClient.delete(`/distance-bands/${id}`);

// Rate Config
export const getRateConfig = () => apiClient.get('/rate-config');
export const updateRateConfig = (id, data) => apiClient.put(`/rate-config/${id}`, data);

// Supervisors
export const getSupervisors = (search) => apiClient.get('/supervisors', { params: { search } });
export const createSupervisor = (data) => apiClient.post('/supervisors', data);
export const updateSupervisor = (id, data) => apiClient.put(`/supervisors/${id}`, data);
export const deleteSupervisor = (id) => apiClient.delete(`/supervisors/${id}`);

// Headmen
export const getHeadmen = (search) => apiClient.get('/headmen', { params: { search } });
export const createHeadman = (data) => apiClient.post('/headmen', data);
export const updateHeadman = (id, data) => apiClient.put(`/headmen/${id}`, data);
export const deleteHeadman = (id) => apiClient.delete(`/headmen/${id}`);

// Drivers
export const getDrivers = (search) => apiClient.get('/drivers', { params: { search } });
export const createDriver = (data) => apiClient.post('/drivers', data);
export const updateDriver = (id, data) => apiClient.put(`/drivers/${id}`, data);
export const deleteDriver = (id) => apiClient.delete(`/drivers/${id}`);

// Trucks
export const getTrucks = (search) => apiClient.get('/trucks', { params: { search } });
export const createTruck = (data) => apiClient.post('/trucks', data);
export const updateTruck = (id, data) => apiClient.put(`/trucks/${id}`, data);
export const deleteTruck = (id) => apiClient.delete(`/trucks/${id}`);

// Outgrowers
export const getOutgrowers = (search) => apiClient.get('/outgrowers', { params: { search } });
export const createOutgrower = (data) => apiClient.post('/outgrowers', data);
export const updateOutgrower = (id, data) => apiClient.put(`/outgrowers/${id}`, data);
export const deleteOutgrower = (id) => apiClient.delete(`/outgrowers/${id}`);

// Harvest Assignments
export const getHarvestAssignments = (params) => apiClient.get('/harvest-assignments', { params });
export const getHarvestAssignment = (id) => apiClient.get(`/harvest-assignments/${id}`);
export const createHarvestAssignment = (data) => apiClient.post('/harvest-assignments', data);
export const updateHarvestAssignment = (id, data) => apiClient.put(`/harvest-assignments/${id}`, data);
export const deleteHarvestAssignment = (id) => apiClient.delete(`/harvest-assignments/${id}`);
export const computeHarvestFinancials = (id) => apiClient.post(`/harvest-assignments/${id}/compute-financials`);

// Loading Records
export const getLoadingRecords = (params) => apiClient.get('/loading-records', { params });
export const getLoadingRecord = (id) => apiClient.get(`/loading-records/${id}`);
export const createLoadingRecord = (data) => apiClient.post('/loading-records', data);
export const updateLoadingRecord = (id, data) => apiClient.put(`/loading-records/${id}`, data);
export const deleteLoadingRecord = (id) => apiClient.delete(`/loading-records/${id}`);
export const computeLoadingFinancials = (id) => apiClient.post(`/loading-records/${id}/compute-financials`);

// Transport Trips
export const getTransportTrips = (params) => apiClient.get('/transport-trips', { params });
export const getTransportTrip = (id) => apiClient.get(`/transport-trips/${id}`);
export const createTransportTrip = (data) => apiClient.post('/transport-trips', data);
export const updateTransportTrip = (id, data) => apiClient.put(`/transport-trips/${id}`, data);
export const deleteTransportTrip = (id) => apiClient.delete(`/transport-trips/${id}`);

// Payroll
export const getHeadmanPayroll = (week, year) => apiClient.get(`/payroll/headman/${week}/${year}`);
export const generateHeadmanPayroll = (week, year) => apiClient.post(`/payroll/generate-headman/${week}/${year}`);
export const markHeadmanPaid = (id) => apiClient.patch(`/payroll/headman/${id}/mark-paid`);

export const getSupervisorPayroll = (week, year) => apiClient.get(`/payroll/supervisor/${week}/${year}`);
export const generateSupervisorPayroll = (week, year) => apiClient.post(`/payroll/generate-supervisor/${week}/${year}`);
export const markSupervisorPaid = (id) => apiClient.patch(`/payroll/supervisor/${id}/mark-paid`);

export const getDriverPayroll = (week, year) => apiClient.get(`/payroll/driver/${week}/${year}`);
export const generateDriverPayroll = (week, year) => apiClient.post(`/payroll/generate-driver/${week}/${year}`);
export const markDriverPaid = (id) => apiClient.patch(`/payroll/driver/${id}/mark-paid`);

// Reports
export const getDailyReturns = (date) => apiClient.get('/reports/daily-returns', { params: { date } });
export const getWeeklyReturns = (week, year) => apiClient.get('/reports/weekly-returns', { params: { week, year } });
export const getHeadmanPerformance = (week, year) => apiClient.get('/reports/headman-performance', { params: { week, year } });
export const getSupervisorPerformance = (week, year) => apiClient.get('/reports/supervisor-performance', { params: { week, year } });
export const getDriverPerformance = (week, year) => apiClient.get('/reports/driver-performance', { params: { week, year } });
export const getCompanySummary = (week, year) => apiClient.get('/reports/company-summary', { params: { week, year } });
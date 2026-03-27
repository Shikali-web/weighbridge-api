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
export const createRateConfig = (data) => apiClient.post('/rate-config', data);
export const updateRateConfig = (id, data) => apiClient.put(`/rate-config/${id}`, data);
export const deleteRateConfig = (id) => apiClient.delete(`/rate-config/${id}`);

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
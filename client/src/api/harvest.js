import apiClient from './client';

export const getHarvestAssignments = (params) => apiClient.get('/harvest-assignments', { params });
export const getHarvestAssignment = (id) => apiClient.get(`/harvest-assignments/${id}`);
export const createHarvestAssignment = (data) => apiClient.post('/harvest-assignments', data);
export const updateHarvestAssignment = (id, data) => apiClient.put(`/harvest-assignments/${id}`, data);
export const deleteHarvestAssignment = (id) => apiClient.delete(`/harvest-assignments/${id}`);
export const computeHarvestFinancials = (id) => apiClient.post(`/harvest-assignments/${id}/compute-financials`);
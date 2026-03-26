import apiClient from './client';

export const getLoadingRecords = (params) => apiClient.get('/loading-records', { params });
export const getLoadingRecord = (id) => apiClient.get(`/loading-records/${id}`);
export const createLoadingRecord = (data) => apiClient.post('/loading-records', data);
export const updateLoadingRecord = (id, data) => apiClient.put(`/loading-records/${id}`, data);
export const deleteLoadingRecord = (id) => apiClient.delete(`/loading-records/${id}`);
export const computeLoadingFinancials = (id) => apiClient.post(`/loading-records/${id}/compute-financials`);
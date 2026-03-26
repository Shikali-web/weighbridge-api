import apiClient from './client';

export const getTransportTrips = (params) => apiClient.get('/transport-trips', { params });
export const getTransportTrip = (id) => apiClient.get(`/transport-trips/${id}`);
export const createTransportTrip = (data) => apiClient.post('/transport-trips', data);
export const updateTransportTrip = (id, data) => apiClient.put(`/transport-trips/${id}`, data);
export const deleteTransportTrip = (id) => apiClient.delete(`/transport-trips/${id}`);
import apiClient from './client';

export const getHeadmanPayroll = (week, year) => apiClient.get(`/payroll/headman/${week}/${year}`);
export const generateHeadmanPayroll = (week, year) => apiClient.post(`/payroll/generate-headman/${week}/${year}`);
export const markHeadmanPaid = (id) => apiClient.patch(`/payroll/headman/${id}/mark-paid`);

export const getSupervisorPayroll = (week, year) => apiClient.get(`/payroll/supervisor/${week}/${year}`);
export const generateSupervisorPayroll = (week, year) => apiClient.post(`/payroll/generate-supervisor/${week}/${year}`);
export const markSupervisorPaid = (id) => apiClient.patch(`/payroll/supervisor/${id}/mark-paid`);

export const getDriverPayroll = (week, year) => apiClient.get(`/payroll/driver/${week}/${year}`);
export const generateDriverPayroll = (week, year) => apiClient.post(`/payroll/generate-driver/${week}/${year}`);
export const markDriverPaid = (id) => apiClient.patch(`/payroll/driver/${id}/mark-paid`);
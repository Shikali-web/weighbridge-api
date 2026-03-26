import apiClient from './client';

export const getDailyReturns = (date) => apiClient.get('/reports/daily-returns', { params: { date } });
export const getWeeklyReturns = (week, year) => apiClient.get('/reports/weekly-returns', { params: { week, year } });
export const getHeadmanPerformance = (week, year) => apiClient.get('/reports/headman-performance', { params: { week, year } });
export const getSupervisorPerformance = (week, year) => apiClient.get('/reports/supervisor-performance', { params: { week, year } });
export const getDriverPerformance = (week, year) => apiClient.get('/reports/driver-performance', { params: { week, year } });
export const getCompanySummary = (week, year) => apiClient.get('/reports/company-summary', { params: { week, year } });
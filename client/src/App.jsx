import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Sidebar from './components/layout/Sidebar';
import TopBar from './components/layout/TopBar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import HarvestList from './pages/harvesting/HarvestList';
import LoadingList from './pages/loading/LoadingList';
import TransportList from './pages/transport/TransportList';
import HeadmanPayroll from './pages/payroll/HeadmanPayroll';
import SupervisorPayroll from './pages/payroll/SupervisorPayroll';
import DriverPayroll from './pages/payroll/DriverPayroll';
import DailyReturns from './pages/reports/DailyReturns';
import WeeklyReturns from './pages/reports/WeeklyReturns';
import HeadmanPerformance from './pages/reports/HeadmanPerformance';
import SupervisorPerformance from './pages/reports/SupervisorPerformance';
import DriverPerformance from './pages/reports/DriverPerformance';
import Supervisors from './pages/setup/Supervisors';
import Headmen from './pages/setup/Headmen';
import DriversTrucks from './pages/setup/DriversTrucks';
import Outgrowers from './pages/setup/Outgrowers';
import Weighbridges from './pages/setup/Weighbridges';
import DistanceBands from './pages/setup/DistanceBands';
import RateConfig from './pages/setup/RateConfig';
import HarvestDetail from './pages/harvesting/HarvestDetail';
import HeadmanPayrollDetails from './pages/payroll/HeadmanPayrollDetails';
import SupervisorPayrollDetails from './pages/payroll/SupervisorPayrollDetails';
import DriverPayrollDetails from './pages/payroll/DriverPayrollDetails';
import HeadmanHarvestReport from './pages/reports/HeadmanHarvestReport';
import SupervisorLoadingReport from './pages/reports/SupervisorLoadingReport';
import OutgrowerPerformance from './pages/reports/OutgrowerPerformance';
import OutgrowerDetails from './pages/reports/OutgrowerDetails';


const queryClient = new QueryClient();

function AppContent() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 ml-64 overflow-hidden">
        <TopBar />
        <main className="p-6 overflow-y-auto h-[calc(100vh-73px)] bg-background">
          <Routes>
           <Route path="/" element={<Dashboard />} />
            <Route path="/harvesting" element={<HarvestList />} />
            <Route path="/loading" element={<LoadingList />} />
            <Route path="/transport" element={<TransportList />} />
            <Route path="/payroll/headman" element={
              <ProtectedRoute roles={['admin']}>
                <HeadmanPayroll />
              </ProtectedRoute>
            } />
            <Route path="/payroll/supervisor" element={
              <ProtectedRoute roles={['admin']}>
                <SupervisorPayroll />
              </ProtectedRoute>
            } />
            <Route path="/payroll/driver" element={
              <ProtectedRoute roles={['admin']}>
                <DriverPayroll />
              </ProtectedRoute>
            } />
            <Route path="/reports/daily" element={<DailyReturns />} />
            <Route path="/reports/weekly" element={<WeeklyReturns />} />
            <Route path="/reports/headman" element={<HeadmanPerformance />} />
            <Route path="/reports/supervisor" element={<SupervisorPerformance />} />
            <Route path="/reports/driver-performance" element={<DriverPerformance />} />
            <Route path="/setup/supervisors" element={
              <ProtectedRoute roles={['admin']}>
                <Supervisors />
              </ProtectedRoute>
            } />
            <Route path="/setup/headmen" element={
              <ProtectedRoute roles={['admin']}>
                <Headmen />
              </ProtectedRoute>
            } />
            <Route path="/setup/drivers" element={
              <ProtectedRoute roles={['admin']}>
                <DriversTrucks />
              </ProtectedRoute>
            } />
            <Route path="/setup/outgrowers" element={
              <ProtectedRoute roles={['admin']}>
                <Outgrowers />
              </ProtectedRoute>
            } />
            <Route path="/setup/weighbridges" element={
              <ProtectedRoute roles={['admin']}>
                <Weighbridges />
              </ProtectedRoute>
            } />
            <Route path="/setup/distance-bands" element={
              <ProtectedRoute roles={['admin']}>
                <DistanceBands />
              </ProtectedRoute>
            } />
            <Route path="/setup/rate-config" element={
              <ProtectedRoute roles={['admin']}>
                <RateConfig />
              </ProtectedRoute>
            } />
            <Route path="/harvesting/:id" element={<HarvestDetail />} />
            <Route path="/payroll/headman-details/:headmanId" element={
              <ProtectedRoute roles={['admin']}>
                <HeadmanPayrollDetails />
              </ProtectedRoute>
            } />
            <Route path="/payroll/supervisor-details/:supervisorId" element={
              <ProtectedRoute roles={['admin']}>
                <SupervisorPayrollDetails />
              </ProtectedRoute>
            } />
            <Route path="/payroll/driver-details/:driverId" element={
              <ProtectedRoute roles={['admin']}>
                <DriverPayrollDetails />
              </ProtectedRoute>
            } />
            <Route path="/reports/headman-harvest" element={<HeadmanHarvestReport />} />
            <Route path="/reports/supervisor-loading" element={<SupervisorLoadingReport />} />
            <Route path="/reports/outgrower-performance" element={<OutgrowerPerformance />} />
            <Route path="/reports/outgrower-details/:outgrowerId" element={<OutgrowerDetails />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <AppContent />
          <Toaster position="top-right" />
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
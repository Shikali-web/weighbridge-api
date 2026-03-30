import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import Sidebar from './components/layout/Sidebar';
import TopBar from './components/layout/TopBar';
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
import HeadmanPerformanceTest from './pages/reports/HeadmanPerformanceTest';
import HeadmanHarvestReport from './pages/reports/HeadmanHarvestReport';
import SupervisorLoadingReport from './pages/reports/SupervisorLoadingReport';
import OutgrowerPerformance from './pages/reports/OutgrowerPerformance';
import OutgrowerDetails from './pages/reports/OutgrowerDetails';
import DailyReturnsWorking from './pages/reports/DailyReturnsWorking';
import DailyNew from './pages/reports/DailyNew';
import DailyReturnsComplete from './pages/reports/DailyReturnsComplete';
const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
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
                <Route path="/payroll/headman" element={<HeadmanPayroll />} />
                <Route path="/payroll/supervisor" element={<SupervisorPayroll />} />
                <Route path="/payroll/driver" element={<DriverPayroll />} />
                <Route path="/reports/daily" element={<DailyReturns />} />
                <Route path="/reports/weekly" element={<WeeklyReturns />} />
                <Route path="/reports/headman" element={<HeadmanPerformance />} />
                <Route path="/reports/supervisor" element={<SupervisorPerformance />} />
                <Route path="/reports/driver-performance" element={<DriverPerformance />} />
                <Route path="/setup/supervisors" element={<Supervisors />} />
                <Route path="/setup/headmen" element={<Headmen />} />
                <Route path="/setup/drivers" element={<DriversTrucks />} />
                <Route path="/setup/outgrowers" element={<Outgrowers />} />
                <Route path="/setup/weighbridges" element={<Weighbridges />} />
                <Route path="/setup/distance-bands" element={<DistanceBands />} />
                <Route path="/setup/rate-config" element={<RateConfig />} />
                <Route path="/harvesting/:id" element={<HarvestDetail />} />
                <Route path="/payroll/headman-details/:headmanId" element={<HeadmanPayrollDetails />} />
                <Route path="/payroll/supervisor-details/:supervisorId" element={<SupervisorPayrollDetails />} />
                <Route path="/payroll/driver-details/:driverId" element={<DriverPayrollDetails />} />
                <Route path="/reports/headman-test" element={<HeadmanPerformanceTest />} />
              <Route path="/reports/headman-harvest" element={<HeadmanHarvestReport />} />
              <Route path="/reports/supervisor-loading" element={<SupervisorLoadingReport />} />
              <Route path="/reports/outgrower-performance" element={<OutgrowerPerformance />} />
              <Route path="/reports/outgrower-details/:outgrowerId" element={<OutgrowerDetails />} />
              <Route path="/reports/daily-working" element={<DailyReturnsWorking />} />
              <Route path="/reports/daily-new" element={<DailyNew />} />
              <Route path="/reports/daily-complete" element={<DailyReturnsComplete />} />
              </Routes>
            </main>
          </div>
        </div>
        <Toaster position="top-right" />
      </Router>
    </QueryClientProvider>
  );
}

export default App;
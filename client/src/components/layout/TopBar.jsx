import React from 'react';
import { useLocation } from 'react-router-dom';
import { getWeekDates, getISOWeek } from '../../utils/formatters';
import { useAuth } from '../../context/AuthContext';

const TopBar = () => {
  const location = useLocation();
  const { user } = useAuth();
  const currentDate = new Date();
  const currentWeek = getISOWeek(currentDate);
  const currentYear = currentDate.getFullYear();
  const weekDates = getWeekDates(currentWeek, currentYear);
  
  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/') return 'Dashboard';
    const parts = path.split('/').filter(p => p);
    if (parts[0] === 'setup') {
      return parts[1]?.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') || 'Setup';
    }
    if (parts[0] === 'payroll') {
      if (parts[1] === 'headman-details') return 'Payroll Details';
      if (parts[1] === 'supervisor-details') return 'Payroll Details';
      if (parts[1] === 'driver-details') return 'Payroll Details';
      return `${parts[1]?.charAt(0).toUpperCase() + parts[1]?.slice(1) || ''} Payroll`;
    }
    if (parts[0] === 'reports') {
      if (parts[1] === 'headman') return 'My Performance';
      if (parts[1] === 'headman-harvest') return 'Headman Harvest Report';
      if (parts[1] === 'supervisor-loading') return 'Supervisor Loading Report';
      if (parts[1] === 'outgrower-performance') return 'Outgrower Performance';
      return parts[1]?.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') || 'Reports';
    }
    if (parts[0] === 'harvesting') return 'Harvest Assignments';
    if (parts[0] === 'loading') return 'Loading & Transport';
    if (parts[0] === 'transport') return 'Transport Trips';
    return parts[parts.length - 1]?.charAt(0).toUpperCase() + parts[parts.length - 1]?.slice(1) || 'Dashboard';
  };

  const getRoleWelcomeMessage = () => {
    switch (user?.role) {
      case 'admin':
        return `Welcome back, ${user?.full_name || user?.username}! You have full system access.`;
      case 'supervisor':
        return `Welcome, ${user?.full_name || user?.username}! You can manage harvest assignments for your headmen.`;
      case 'weighbridge':
        return `Welcome, ${user?.full_name || user?.username}! Record loads and transport trips here.`;
      case 'headman':
        return `Welcome, ${user?.full_name || user?.username}! View your performance metrics here.`;
      default:
        return `Welcome, ${user?.full_name || user?.username}!`;
    }
  };

  return (
    <div className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{getPageTitle()}</h1>
          <p className="text-sm text-gray-500 mt-1">
            Week {currentWeek} — {weekDates.formatted}
          </p>
        </div>
        
        <div className="text-right">
          <p className="text-sm text-gray-600">{getRoleWelcomeMessage()}</p>
        </div>
      </div>
    </div>
  );
};

export default TopBar;
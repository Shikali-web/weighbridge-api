import React from 'react';
import { useLocation } from 'react-router-dom';
import { getWeekDates, getISOWeek } from '../../utils/formatters';
import { User } from 'lucide-react';

const TopBar = () => {
  const location = useLocation();
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
      return `${parts[1]?.charAt(0).toUpperCase() + parts[1]?.slice(1) || ''} Payroll`;
    }
    if (parts[0] === 'reports') {
      return parts[1]?.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') || 'Reports';
    }
    return parts[parts.length - 1]?.charAt(0).toUpperCase() + parts[parts.length - 1]?.slice(1) || 'Dashboard';
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
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 bg-gray-200 rounded-full flex items-center justify-center">
              <User className="h-4 w-4 text-gray-600" />
            </div>
            <span className="text-sm font-medium text-gray-700">Admin User</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TopBar;
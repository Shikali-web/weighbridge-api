import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getWeekDates, getISOWeek } from '../../utils/formatters';
import { User, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/button';

const TopBar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
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
      if (parts[1] === 'headman-details') return 'Headman Payroll Details';
      if (parts[1] === 'supervisor-details') return 'Supervisor Payroll Details';
      if (parts[1] === 'driver-details') return 'Driver Payroll Details';
      return `${parts[1]?.charAt(0).toUpperCase() + parts[1]?.slice(1) || ''} Payroll`;
    }
    if (parts[0] === 'reports') {
      if (parts[1] === 'headman-harvest') return 'Headman Harvest Report';
      if (parts[1] === 'supervisor-loading') return 'Supervisor Loading Report';
      if (parts[1] === 'outgrower-performance') return 'Outgrower Performance';
      return parts[1]?.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') || 'Reports';
    }
    return parts[parts.length - 1]?.charAt(0).toUpperCase() + parts[parts.length - 1]?.slice(1) || 'Dashboard';
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getRoleBadgeColor = () => {
    switch (user?.role) {
      case 'admin': return 'bg-red-100 text-red-800';
      case 'supervisor': return 'bg-blue-100 text-blue-800';
      case 'weighbridge': return 'bg-green-100 text-green-800';
      case 'headman': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
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
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-700">{user?.full_name || user?.username}</p>
              <span className={`text-xs px-2 py-0.5 rounded-full ${getRoleBadgeColor()}`}>
                {user?.role?.toUpperCase() || 'USER'}
              </span>
            </div>
            <div className="h-8 w-8 bg-gray-200 rounded-full flex items-center justify-center">
              <User className="h-4 w-4 text-gray-600" />
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleLogout}
              className="text-gray-600 hover:text-red-600"
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TopBar;
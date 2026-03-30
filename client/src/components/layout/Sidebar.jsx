import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  LayoutDashboard, 
  Truck, 
  Scale, 
  Users, 
  UserCircle, 
  FileText, 
  DollarSign,
  ChevronDown,
  ChevronRight,
  Settings,
  ClipboardList,
  BarChart,
  MapPin,
  Calendar,
  TrendingUp,
  Activity,
  User,
  LogOut
} from 'lucide-react';

const Sidebar = () => {
  const { user, logout } = useAuth();
  const [openGroups, setOpenGroups] = useState({
    operations: true,
    payroll: true,
    reports: true,
    setup: true
  });

  const toggleGroup = (group) => {
    setOpenGroups(prev => ({ ...prev, [group]: !prev[group] }));
  };

  // Define menu items based on user role
  const getNavItems = () => {
    const role = user?.role;
    
    // Common items for all users
    const commonItems = [
      { path: '/', icon: LayoutDashboard, label: 'Dashboard', group: null }
    ];
    
    // Role-specific items
    let operationsItems = [];
    let payrollItems = [];
    let reportsItems = [];
    let setupItems = [];
    
    if (role === 'admin') {
      // Admin sees everything
      operationsItems = [
        { path: '/harvesting', icon: Scale, label: 'Harvest Assignments' },
        { path: '/loading', icon: Truck, label: 'Loading & Transport' },
      ];
      payrollItems = [
        { path: '/payroll/headman', icon: Users, label: 'Headman Payroll' },
        { path: '/payroll/supervisor', icon: UserCircle, label: 'Supervisor Payroll' },
        { path: '/payroll/driver', icon: Truck, label: 'Driver Payroll' },
      ];
      reportsItems = [
        { path: '/reports/daily', icon: Calendar, label: 'Daily Returns' },
        { path: '/reports/weekly', icon: TrendingUp, label: 'Weekly Returns' },
        { path: '/reports/headman', icon: Users, label: 'Headman Performance' },
        { path: '/reports/headman-harvest', icon: Scale, label: 'Headman Harvest Report' },
        { path: '/reports/supervisor', icon: UserCircle, label: 'Supervisor Performance' },
        { path: '/reports/supervisor-loading', icon: Truck, label: 'Supervisor Loading Report' },
        { path: '/reports/driver-performance', icon: Activity, label: 'Driver Performance' },
        { path: '/reports/outgrower-performance', icon: Users, label: 'Outgrower Performance' },
      ];
      setupItems = [
        { path: '/setup/supervisors', icon: UserCircle, label: 'Supervisors' },
        { path: '/setup/headmen', icon: Users, label: 'Headmen' },
        { path: '/setup/drivers', icon: Truck, label: 'Drivers & Trucks' },
        { path: '/setup/outgrowers', icon: MapPin, label: 'Outgrowers' },
        { path: '/setup/weighbridges', icon: Scale, label: 'Weighbridges' },
        { path: '/setup/distance-bands', icon: Activity, label: 'Distance Bands' },
        { path: '/setup/rate-config', icon: DollarSign, label: 'Rate Configuration' },
      ];
    } 
    else if (role === 'supervisor') {
      // Supervisor sees only harvest assignments and their reports
      operationsItems = [
        { path: '/harvesting', icon: Scale, label: 'Harvest Assignments' },
      ];
      reportsItems = [
        { path: '/reports/headman', icon: Users, label: 'Headman Performance' },
        { path: '/reports/headman-harvest', icon: Scale, label: 'Headman Harvest Report' },
      ];
    }
    else if (role === 'weighbridge') {
      // Weighbridge operator sees only loading & transport
      operationsItems = [
        { path: '/loading', icon: Truck, label: 'Loading & Transport' },
      ];
      reportsItems = [
        { path: '/reports/daily', icon: Calendar, label: 'Daily Returns' },
        { path: '/reports/outgrower-performance', icon: Users, label: 'Outgrower Performance' },
      ];
    }
    else if (role === 'headman') {
      // Headman sees only their own performance
      reportsItems = [
        { path: '/reports/headman', icon: Users, label: 'My Performance' },
      ];
    }
    
    // Build navigation items
    const navItems = [...commonItems];
    
    if (operationsItems.length > 0) {
      navItems.push({
        group: 'operations',
        label: 'Operations',
        icon: ClipboardList,
        items: operationsItems
      });
    }
    
    if (payrollItems.length > 0) {
      navItems.push({
        group: 'payroll',
        label: 'Payroll',
        icon: DollarSign,
        items: payrollItems
      });
    }
    
    if (reportsItems.length > 0) {
      navItems.push({
        group: 'reports',
        label: 'Reports',
        icon: BarChart,
        items: reportsItems
      });
    }
    
    if (setupItems.length > 0) {
      navItems.push({
        group: 'setup',
        label: 'Setup',
        icon: Settings,
        items: setupItems
      });
    }
    
    return navItems;
  };
  
  const navItems = getNavItems();

  return (
    <div className="w-64 bg-primary text-white flex flex-col fixed h-full shadow-lg z-20">
      <div className="p-6 border-b border-primary-light">
        <h1 className="text-xl font-bold text-white">Sagib Enterprises</h1>
        <p className="text-sm text-accent mt-1">Cane Operations</p>
        <div className="mt-2 text-xs text-gray-300">
          Logged in as: <span className="font-medium text-white">{user?.full_name || user?.username}</span>
          <span className="ml-1 px-1.5 py-0.5 bg-primary-light rounded text-xs">
            {user?.role?.toUpperCase()}
          </span>
        </div>
      </div>
      
      <nav className="flex-1 overflow-y-auto py-4">
        {navItems.map((item, idx) => {
          if (item.group === null) {
            return (
              <NavLink
                key={idx}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center px-6 py-3 text-sm transition-colors ${
                    isActive 
                      ? 'bg-primary-light border-l-4 border-accent text-white' 
                      : 'text-white hover:bg-primary-light hover:text-white'
                  }`
                }
              >
                <item.icon className="h-5 w-5 mr-3 text-white" />
                {item.label}
              </NavLink>
            );
          }
          
          return (
            <div key={item.group} className="mb-2">
              <button
                onClick={() => toggleGroup(item.group)}
                className="w-full flex items-center justify-between px-6 py-3 text-sm text-white hover:bg-primary-light transition-colors"
              >
                <div className="flex items-center">
                  <item.icon className="h-5 w-5 mr-3 text-white" />
                  <span className="text-white">{item.label}</span>
                </div>
                {openGroups[item.group] ? (
                  <ChevronDown className="h-4 w-4 text-white" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-white" />
                )}
              </button>
              
              {openGroups[item.group] && (
                <div className="ml-8">
                  {item.items.map((subItem, subIdx) => (
                    <NavLink
                      key={subIdx}
                      to={subItem.path}
                      className={({ isActive }) =>
                        `flex items-center px-6 py-2 text-sm transition-colors ${
                          isActive 
                            ? 'bg-primary-light border-l-4 border-accent text-white' 
                            : 'text-white hover:bg-primary-light hover:text-white'
                        }`
                      }
                    >
                      <subItem.icon className="h-4 w-4 mr-3 text-white" />
                      <span className="text-white">{subItem.label}</span>
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>
      
      {/* User Info Footer */}
      <div className="p-4 border-t border-primary-light">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 bg-primary-light rounded-full flex items-center justify-center">
            <User className="h-4 w-4 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-xs font-medium text-white truncate">{user?.full_name || user?.username}</p>
            <p className="text-xs text-gray-300">{user?.role?.toUpperCase()}</p>
          </div>
          <button
            onClick={logout}
            className="p-1 hover:bg-primary-light rounded transition-colors"
            title="Logout"
          >
            <LogOut className="h-4 w-4 text-gray-300 hover:text-white" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
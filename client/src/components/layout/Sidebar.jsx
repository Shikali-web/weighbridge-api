import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, Truck, Scale, Users, UserCircle, 
  FileText, DollarSign, ChevronDown, ChevronRight, 
  Settings, ClipboardList, BarChart 
} from 'lucide-react';

const Sidebar = () => {
  const [openGroups, setOpenGroups] = useState({
    operations: true,
    payroll: true,
    reports: true,
    setup: true
  });

  const toggleGroup = (group) => {
    setOpenGroups(prev => ({ ...prev, [group]: !prev[group] }));
  };

  const navItems = [
    { path: '/', icon: LayoutDashboard, label: 'Dashboard', group: null },
    {
      group: 'operations',
      label: 'Operations',
      icon: ClipboardList,
      items: [
        { path: '/harvesting', icon: Truck, label: 'Harvest Assignments' },
        { path: '/loading', icon: Scale, label: 'Loading Records' },
        { path: '/transport', icon: Truck, label: 'Transport Trips' },
      ]
    },
    {
      group: 'payroll',
      label: 'Payroll',
      icon: DollarSign,
      items: [
        { path: '/payroll/headman', icon: Users, label: 'Headman Payroll' },
        { path: '/payroll/supervisor', icon: UserCircle, label: 'Supervisor Payroll' },
        { path: '/payroll/driver', icon: Truck, label: 'Driver Payroll' },
      ]
    },
    {
      group: 'reports',
      label: 'Reports',
      icon: BarChart,
      items: [
        { path: '/reports/daily', icon: FileText, label: 'Daily Returns' },
        { path: '/reports/weekly', icon: FileText, label: 'Weekly Returns' },
        { path: '/reports/headman', icon: Users, label: 'Headman Performance' },
        { path: '/reports/supervisor', icon: UserCircle, label: 'Supervisor Performance' },
        { path: '/reports/driver', icon: Truck, label: 'Driver Performance' },
      ]
    },
    {
      group: 'setup',
      label: 'Setup',
      icon: Settings,
      items: [
        { path: '/setup/supervisors', icon: UserCircle, label: 'Supervisors' },
        { path: '/setup/headmen', icon: Users, label: 'Headmen' },
        { path: '/setup/drivers', icon: Truck, label: 'Drivers & Trucks' },
        { path: '/setup/outgrowers', icon: Users, label: 'Outgrowers' },
        { path: '/setup/weighbridges', icon: Scale, label: 'Weighbridges' },
        { path: '/setup/distance-bands', icon: Truck, label: 'Distance Bands' },
        { path: '/setup/rate-config', icon: DollarSign, label: 'Rate Configuration' },
      ]
    }
  ];

  return (
    <div className="w-64 bg-primary text-white flex flex-col fixed h-full shadow-lg">
      <div className="p-6 border-b border-primary-light">
        <h1 className="text-xl font-bold text-white">Sagib Enterprises</h1>
        <p className="text-sm text-accent mt-1">Cane Operations</p>
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
    </div>
  );
};

export default Sidebar;
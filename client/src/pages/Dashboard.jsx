import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getCompanySummary } from '../api/reports';
import StatCard from "../components/shared/StatCard";
import DataTable from '../components/shared/DataTable';
import { formatCurrency, formatTons, getWeekDates, getISOWeek } from '../utils/formatters';
import { DollarSign, Truck, Scale, TrendingUp, Users, Package } from 'lucide-react';

const Dashboard = () => {
  const currentDate = new Date();
  const currentWeek = getISOWeek(currentDate);
  const currentYear = currentDate.getFullYear();
  const weekDates = getWeekDates(currentWeek, currentYear);
  
  const { data: summary, isLoading } = useQuery({
    queryKey: ['company-summary', currentWeek, currentYear],
    queryFn: () => getCompanySummary(currentWeek, currentYear)
  });

  // Mock data for demonstration (replace with actual API calls)
  const statCards = [
    { 
      label: "This Week's Harvest Revenue", 
      value: formatCurrency(245000), 
      subValue: "25,000 tons harvested",
      color: "green",
      icon: DollarSign
    },
    { 
      label: "This Week's Loading Revenue", 
      value: formatCurrency(98500), 
      subValue: "18,500 tons loaded",
      color: "blue",
      icon: Scale
    },
    { 
      label: "This Week's Transport Revenue", 
      value: formatCurrency(147200), 
      subValue: "342 trips",
      color: "amber",
      icon: Truck
    },
    { 
      label: "Total Weekly Net", 
      value: formatCurrency(490700), 
      subValue: "↑ 12% from last week",
      color: "green",
      icon: TrendingUp
    },
    { 
      label: "Total Tons Harvested", 
      value: formatTons(25000), 
      subValue: "This week",
      color: "blue",
      icon: Package
    },
    { 
      label: "Active Assignments", 
      value: "18", 
      subValue: "12 completed, 6 in progress",
      color: "amber",
      icon: Users
    }
  ];

  const recentHarvests = [
    { id: 1, headman: "John Mwangi", outgrower: "Kamau Farm", date: "2026-03-25", turnup: 12.5, expected_tons: 28.125, actual_tons: 26.8, status: "completed" },
    { id: 2, headman: "Peter Omondi", outgrower: "Omondi Fields", date: "2026-03-24", turnup: 10.2, expected_tons: 22.95, actual_tons: 21.5, status: "completed" },
    { id: 3, headman: "Mary Wanjiku", outgrower: "Wanjiku Estate", date: "2026-03-24", turnup: 15.0, expected_tons: 33.75, actual_tons: null, status: "in_progress" },
    { id: 4, headman: "James Kiprop", outgrower: "Kiprop Farm", date: "2026-03-23", turnup: 8.5, expected_tons: 19.125, actual_tons: 18.9, status: "completed" },
    { id: 5, headman: "Lucy Atieno", outgrower: "Atieno Holdings", date: "2026-03-23", turnup: 11.0, expected_tons: 24.75, actual_tons: 23.2, status: "completed" }
  ];

  const unpaidPayroll = [
    { id: 1, headman: "John Mwangi", net_payable: 45200, week: 12 },
    { id: 2, headman: "Peter Omondi", net_payable: 38900, week: 12 },
    { id: 3, headman: "Mary Wanjiku", net_payable: 52100, week: 12 },
    { id: 4, headman: "James Kiprop", net_payable: 29400, week: 12 }
  ];

  const harvestColumns = [
    { key: "headman", label: "Headman" },
    { key: "outgrower", label: "Outgrower" },
    { key: "date", label: "Date" },
    { key: "turnup", label: "Turnup" },
    { key: "expected_tons", label: "Expected Tons" },
    { key: "actual_tons", label: "Actual Tons" },
    { key: "status", label: "Status" }
  ];

  const payrollColumns = [
    { key: "headman", label: "Headman" },
    { key: "net_payable", label: "Net Payable" },
    { key: "week", label: "Week" }
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Dashboard Overview</h2>
        <p className="text-gray-600 mt-1">Week {currentWeek} • {weekDates.formatted}</p>
      </div>

      {/* Stat Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((stat, index) => (
          <StatCard
            key={index}
            label={stat.label}
            value={stat.value}
            subValue={stat.subValue}
            color={stat.color}
            icon={stat.icon}
          />
        ))}
      </div>

      {/* Charts Section (Placeholder) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Daily Revenue Breakdown</h3>
          <div className="h-80 flex items-center justify-center text-gray-500">
            Bar Chart Placeholder - Coming Soon
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Headmen Performance</h3>
          <div className="h-80 flex items-center justify-center text-gray-500">
            Horizontal Bar Chart Placeholder - Coming Soon
          </div>
        </div>
      </div>

      {/* Tables Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Harvest Assignments</h3>
          <DataTable
            columns={harvestColumns}
            data={recentHarvests}
            loading={false}
            emptyMessage="No harvest assignments found"
          />
        </div>
        
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Unpaid Payroll This Week</h3>
          <DataTable
            columns={payrollColumns}
            data={unpaidPayroll}
            loading={false}
            emptyMessage="All payroll has been paid"
          />
          <div className="mt-4 text-right">
            <button className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-light transition-colors">
              Mark All as Paid
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
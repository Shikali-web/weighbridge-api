import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Calendar, TrendingUp, Truck, Scale } from 'lucide-react';
import { getDailyReturns } from '../../api/reports';
import StatCard from '../../components/shared/StatCard';
import DataTable from '../../components/shared/DataTable';
import EmptyState from '../../components/shared/EmptyState';
import { formatCurrency, formatTons } from '../../utils/formatters';

const DailyReturns = () => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const { data: returns, isLoading, refetch } = useQuery({
    queryKey: ['daily-returns', selectedDate],
    queryFn: () => getDailyReturns(selectedDate),
    enabled: true,
  });

  const reportData = returns?.data;

  const handleDateChange = (e) => {
    setSelectedDate(e.target.value);
  };

  if (!reportData && !isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900">Daily Returns</h2>
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-gray-500" />
            <input
              type="date"
              value={selectedDate}
              onChange={handleDateChange}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
        <EmptyState 
          title="No Data Available"
          subtitle={`No returns found for ${selectedDate}`}
        />
      </div>
    );
  }

  const stats = [
    { 
      label: "Harvest Revenue", 
      value: formatCurrency(reportData?.harvest_revenue || 0),
      subValue: "From cane harvesting",
      color: "green",
      icon: Scale
    },
    { 
      label: "Loading Revenue", 
      value: formatCurrency(reportData?.loading_revenue || 0),
      subValue: "From loading services",
      color: "blue",
      icon: Truck
    },
    { 
      label: "Transport Revenue", 
      value: formatCurrency(reportData?.transport_revenue || 0),
      subValue: "From transportation",
      color: "amber",
      icon: TrendingUp
    },
    { 
      label: "Total Daily Revenue", 
      value: formatCurrency(reportData?.total_revenue || 0),
      subValue: "Combined revenue",
      color: "green",
      icon: TrendingUp
    }
  ];

  const breakdownColumns = [
    { key: "category", label: "Category" },
    { key: "revenue", label: "Revenue", render: (v) => formatCurrency(v) },
    { key: "costs", label: "Costs", render: (v) => formatCurrency(v) },
    { key: "sagib_net", label: "Sagib Net", render: (v) => formatCurrency(v) },
  ];

  const breakdownData = [
    { 
      category: "Harvesting", 
      revenue: reportData?.harvest_revenue || 0,
      costs: reportData?.harvest_costs || 0,
      sagib_net: (reportData?.harvest_revenue || 0) - (reportData?.harvest_costs || 0)
    },
    { 
      category: "Loading", 
      revenue: reportData?.loading_revenue || 0,
      costs: reportData?.loading_costs || 0,
      sagib_net: (reportData?.loading_revenue || 0) - (reportData?.loading_costs || 0)
    },
    { 
      category: "Transport", 
      revenue: reportData?.transport_revenue || 0,
      costs: reportData?.transport_costs || 0,
      sagib_net: (reportData?.transport_revenue || 0) - (reportData?.transport_costs || 0)
    },
    { 
      category: "TOTAL", 
      revenue: reportData?.total_revenue || 0,
      costs: (reportData?.harvest_costs || 0) + (reportData?.loading_costs || 0) + (reportData?.transport_costs || 0),
      sagib_net: reportData?.sagib_net || 0
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Daily Returns</h2>
          <p className="text-sm text-gray-500 mt-1">Revenue breakdown for {new Date(selectedDate).toLocaleDateString()}</p>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-gray-500" />
          <input
            type="date"
            value={selectedDate}
            onChange={handleDateChange}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
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

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Breakdown by Service</h3>
        <DataTable
          columns={breakdownColumns}
          data={breakdownData}
          loading={isLoading}
          emptyMessage="No data available"
        />
      </div>
    </div>
  );
};

export default DailyReturns;
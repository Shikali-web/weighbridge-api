import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Calendar, TrendingUp, Truck, Scale, ArrowUp, ArrowDown } from 'lucide-react';
import { getDailyReturns } from '../../api/reports';
import StatCard from '../../components/shared/StatCard';
import DataTable from '../../components/shared/DataTable';
import EmptyState from '../../components/shared/EmptyState';
import { formatCurrency, formatTons } from '../../utils/formatters';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const DailyReturns = () => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const { data: returns, isLoading, refetch } = useQuery({
    queryKey: ['daily-returns', selectedDate],
    queryFn: () => getDailyReturns(selectedDate),
    enabled: true,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const handleDateChange = (e) => {
    setSelectedDate(e.target.value);
  };

  const reportData = returns?.data || {};
  const hasData = reportData.total_revenue > 0;

  const stats = [
    { 
      label: "Harvest Revenue", 
      value: formatCurrency(reportData.harvest_revenue || 0),
      subValue: `From cane harvesting`,
      color: "green",
      icon: Scale
    },
    { 
      label: "Loading Revenue", 
      value: formatCurrency(reportData.loading_revenue || 0),
      subValue: `From loading services`,
      color: "blue",
      icon: Truck
    },
    { 
      label: "Transport Revenue", 
      value: formatCurrency(reportData.transport_revenue || 0),
      subValue: `From transportation`,
      color: "amber",
      icon: TrendingUp
    },
    { 
      label: "Total Daily Revenue", 
      value: formatCurrency(reportData.total_revenue || 0),
      subValue: `Combined revenue`,
      color: "green",
      icon: TrendingUp
    }
  ];

  const chartData = [
    { name: 'Harvest', revenue: reportData.harvest_revenue || 0, color: '#22c55e' },
    { name: 'Loading', revenue: reportData.loading_revenue || 0, color: '#3b82f6' },
    { name: 'Transport', revenue: reportData.transport_revenue || 0, color: '#f59e0b' }
  ];

  const breakdownColumns = [
    { key: "category", label: "Category" },
    { key: "revenue", label: "Revenue", render: (v) => formatCurrency(v) },
    { key: "costs", label: "Costs", render: (v) => formatCurrency(v) },
    { key: "sagib_net", label: "Sagib Net", render: (v) => formatCurrency(v) },
    { key: "margin", label: "Margin %", render: (v, row) => row.revenue > 0 ? ((row.sagib_net / row.revenue) * 100).toFixed(1) + '%' : '0%' }
  ];

  const breakdownData = [
    { 
      category: "Harvesting", 
      revenue: reportData.harvest_revenue || 0,
      costs: reportData.harvest_costs || 0,
      sagib_net: (reportData.harvest_revenue || 0) - (reportData.harvest_costs || 0)
    },
    { 
      category: "Loading", 
      revenue: reportData.loading_revenue || 0,
      costs: reportData.loading_costs || 0,
      sagib_net: (reportData.loading_revenue || 0) - (reportData.loading_costs || 0)
    },
    { 
      category: "Transport", 
      revenue: reportData.transport_revenue || 0,
      costs: reportData.transport_costs || 0,
      sagib_net: (reportData.transport_revenue || 0) - (reportData.transport_costs || 0)
    },
    { 
      category: "TOTAL", 
      revenue: reportData.total_revenue || 0,
      costs: (reportData.harvest_costs || 0) + (reportData.loading_costs || 0) + (reportData.transport_costs || 0),
      sagib_net: reportData.sagib_net || 0
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Daily Returns</h2>
          <p className="text-sm text-gray-500 mt-1">Real-time revenue breakdown for selected date</p>
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

      {!isLoading && !hasData ? (
        <EmptyState 
          title="No Data Available"
          subtitle={`No returns found for ${new Date(selectedDate).toLocaleDateString()}. Add harvest, loading, or transport records first.`}
        />
      ) : (
        <>
          {/* Stat Cards */}
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

          {/* Revenue Chart */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Breakdown by Service</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis tickFormatter={(value) => `KES ${(value / 1000).toFixed(0)}K`} />
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                  <Bar dataKey="revenue" name="Revenue">
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Revenue Breakdown Table */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Breakdown by Service</h3>
            <DataTable
              columns={breakdownColumns}
              data={breakdownData}
              loading={isLoading}
              emptyMessage="No data available"
            />
          </div>

          {/* Profitability Summary */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Daily Profitability Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Total Revenue</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(reportData.total_revenue || 0)}</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Total Costs</p>
                <p className="text-2xl font-bold text-red-600">{formatCurrency((reportData.harvest_costs || 0) + (reportData.loading_costs || 0) + (reportData.transport_costs || 0))}</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Sagib Net Profit</p>
                <p className="text-2xl font-bold text-primary">{formatCurrency(reportData.sagib_net || 0)}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {reportData.total_revenue > 0 ? ((reportData.sagib_net / reportData.total_revenue) * 100).toFixed(1) : 0}% margin
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default DailyReturns;
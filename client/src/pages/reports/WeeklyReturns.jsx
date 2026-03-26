import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import WeekPicker from '../../components/shared/WeekPicker';
import StatCard from '../../components/shared/StatCard';
import DataTable from '../../components/shared/DataTable';
import { getWeeklyReturns, getCompanySummary } from '../../api/reports';
import { formatCurrency, formatTons, getISOWeek } from '../../utils/formatters';

const WeeklyReturns = () => {
  const currentDate = new Date();
  const [week, setWeek] = useState(getISOWeek(currentDate));
  const [year, setYear] = useState(currentDate.getFullYear());

  const { data: returns, isLoading } = useQuery({
    queryKey: ['weekly-returns', week, year],
    queryFn: () => getWeeklyReturns(week, year)
  });

  const { data: summary } = useQuery({
    queryKey: ['company-summary', week, year],
    queryFn: () => getCompanySummary(week, year)
  });

  const handleWeekChange = (newWeek, newYear) => {
    setWeek(newWeek);
    setYear(newYear);
  };

  const reportData = returns?.data || {};
  const summaryData = summary?.data || {};

  const breakdownColumns = [
    { key: "service", label: "Service" },
    { key: "factory_revenue", label: "Factory Revenue", render: (v) => formatCurrency(v) },
    { key: "costs", label: "Costs", render: (v) => formatCurrency(v) },
    { key: "gross_profit", label: "Gross Profit", render: (v) => formatCurrency(v) },
    { key: "share", label: "Headman/Driver Share", render: (v) => formatCurrency(v) },
    { key: "sagib_net", label: "Sagib Net", render: (v) => formatCurrency(v) }
  ];

  const breakdownData = [
    { 
      service: "Harvest", 
      factory_revenue: summaryData.harvest_revenue || 0,
      costs: summaryData.harvest_costs || 0,
      gross_profit: (summaryData.harvest_revenue || 0) - (summaryData.harvest_costs || 0),
      share: summaryData.headman_share || 0,
      sagib_net: summaryData.sagib_harvest_net || 0
    },
    { 
      service: "Loading", 
      factory_revenue: summaryData.loading_revenue || 0,
      costs: summaryData.loading_costs || 0,
      gross_profit: (summaryData.loading_revenue || 0) - (summaryData.loading_costs || 0),
      share: summaryData.loader_share || 0,
      sagib_net: summaryData.sagib_loading_net || 0
    },
    { 
      service: "Transport", 
      factory_revenue: summaryData.transport_revenue || 0,
      costs: summaryData.transport_costs || 0,
      gross_profit: (summaryData.transport_revenue || 0) - (summaryData.transport_costs || 0),
      share: summaryData.driver_share || 0,
      sagib_net: summaryData.sagib_transport_net || 0
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Weekly Returns</h2>
      </div>

      <WeekPicker week={week} year={year} onChange={handleWeekChange} />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard 
          label="Harvest Revenue" 
          value={formatCurrency(summaryData.harvest_revenue || 0)}
          color="green"
        />
        <StatCard 
          label="Loading Revenue" 
          value={formatCurrency(summaryData.loading_revenue || 0)}
          color="blue"
        />
        <StatCard 
          label="Transport Revenue" 
          value={formatCurrency(summaryData.transport_revenue || 0)}
          color="amber"
        />
        <StatCard 
          label="Total Net" 
          value={formatCurrency(summaryData.total_sagib_net || 0)}
          color="green"
        />
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">8-Week Trend</h3>
        <div className="h-80 flex items-center justify-center text-gray-500">
          Line Chart Placeholder - Coming Soon
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Service Breakdown</h3>
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

export default WeeklyReturns;
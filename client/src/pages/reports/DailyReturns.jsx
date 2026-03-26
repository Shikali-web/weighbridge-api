import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Calendar } from 'lucide-react';
import { getDailyReturns } from '../../api/reports';
import StatCard from '../../components/shared/DataTable';
import EmptyState from '../../components/shared/EmptyState';
import { formatCurrency } from '../../utils/formatters';

const DailyReturns = () => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const { data: returns, isLoading } = useQuery({
    queryKey: ['daily-returns', selectedDate],
    queryFn: () => getDailyReturns(selectedDate)
  });

  const reportData = returns?.data;

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
              onChange={(e) => setSelectedDate(e.target.value)}
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Daily Returns</h2>
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-gray-500" />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard 
          label="Harvest Revenue" 
          value={formatCurrency(reportData?.harvest_revenue || 0)}
          color="green"
        />
        <StatCard 
          label="Loading Revenue" 
          value={formatCurrency(reportData?.loading_revenue || 0)}
          color="blue"
        />
        <StatCard 
          label="Transport Revenue" 
          value={formatCurrency(reportData?.transport_revenue || 0)}
          color="amber"
        />
        <StatCard 
          label="Total Daily Revenue" 
          value={formatCurrency(reportData?.total_revenue || 0)}
          color="green"
        />
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Breakdown</h3>
        <div className="h-80 flex items-center justify-center text-gray-500">
          Stacked Bar Chart Placeholder - Coming Soon
        </div>
      </div>
    </div>
  );
};

export default DailyReturns;
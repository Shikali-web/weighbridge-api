import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import WeekPicker from '../../components/shared/WeekPicker';
import DataTable from '../../components/shared/DataTable';
import EmptyState from '../../components/shared/EmptyState';
import { Button } from '../../components/ui/button';
import { getSupervisorPerformance } from '../../api/reports';
import { formatCurrency, formatTons, getISOWeek } from '../../utils/formatters';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ArrowLeft } from 'lucide-react';

const SupervisorPerformance = () => {
  const navigate = useNavigate();
  const currentDate = new Date();
  const [week, setWeek] = useState(getISOWeek(currentDate));
  const [year, setYear] = useState(currentDate.getFullYear());

  const { data: performance, isLoading, error } = useQuery({
    queryKey: ['supervisor-performance', week, year],
    queryFn: () => getSupervisorPerformance(week, year),
    enabled: true,
    retry: 1,
  });

  const handleWeekChange = (newWeek, newYear) => {
    setWeek(newWeek);
    setYear(newYear);
  };

  const performanceData = performance?.data || [];

  const chartData = performanceData.slice(0, 10).map(item => ({
    name: item.supervisor_name?.length > 15 ? item.supervisor_name.substring(0, 12) + '...' : item.supervisor_name || 'Unknown',
    trips: item.total_trips || 0,
    tons: item.total_tons || 0,
    pay: item.weekly_pay || 0
  }));

  const columns = [
    { key: "rank", label: "Rank", render: (_, row, idx) => idx + 1 },
    { key: "supervisor_name", label: "Supervisor", render: (v) => v || 'N/A' },
    { key: "total_trips", label: "Total Trips" },
    { key: "total_tons", label: "Total Tons", render: (v) => formatTons(v || 0) },
    { key: "weekly_pay", label: "Weekly Pay", render: (v) => formatCurrency(v || 0) },
    { key: "assignments_supervised", label: "Assignments", render: (v) => v || 0 }
  ];

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/reports')} className="p-2">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h2 className="text-2xl font-bold text-gray-900">Supervisor Performance</h2>
        </div>
        <WeekPicker week={week} year={year} onChange={handleWeekChange} />
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-600">Error loading data. Please try again.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate('/reports')} className="p-2">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Supervisor Performance</h2>
          <p className="text-sm text-gray-500 mt-1">Performance metrics by supervisor for the selected week</p>
        </div>
      </div>

      <WeekPicker week={week} year={year} onChange={handleWeekChange} />

      {!isLoading && performanceData.length === 0 ? (
        <EmptyState 
          title="No Performance Data"
          subtitle={`No supervisor performance data found for week ${week}, ${year}. Add loading records first.`}
        />
      ) : (
        <>
          {/* Chart */}
          {chartData.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Trips per Supervisor</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value) => [value, 'Trips']} />
                    <Bar dataKey="trips" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          <DataTable
            columns={columns}
            data={performanceData}
            loading={isLoading}
            emptyMessage="No supervisor performance data found for this week"
          />
        </>
      )}
    </div>
  );
};

export default SupervisorPerformance;
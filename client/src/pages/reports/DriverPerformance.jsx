import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import WeekPicker from '../../components/shared/WeekPicker';
import DataTable from '../../components/shared/DataTable';
import { getDriverPerformance } from '../../api/reports';
import { formatCurrency, formatTons, getISOWeek } from '../../utils/formatters';

const DriverPerformance = () => {
  const currentDate = new Date();
  const [week, setWeek] = useState(getISOWeek(currentDate));
  const [year, setYear] = useState(currentDate.getFullYear());

  const { data: performance, isLoading } = useQuery({
    queryKey: ['driver-performance', week, year],
    queryFn: () => getDriverPerformance(week, year)
  });

  const handleWeekChange = (newWeek, newYear) => {
    setWeek(newWeek);
    setYear(newYear);
  };

  const performanceData = performance?.data || [];

  const columns = [
    { key: "rank", label: "Rank" },
    { key: "driver_name", label: "Driver" },
    { key: "truck_plate", label: "Truck" },
    { key: "total_trips", label: "Total Trips" },
    { key: "total_tons", label: "Total Tons Transported", render: (v) => formatTons(v) },
    { key: "weekly_pay", label: "Weekly Pay", render: (v) => formatCurrency(v) }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Driver Performance</h2>
      </div>

      <WeekPicker week={week} year={year} onChange={handleWeekChange} />

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Tons per Driver</h3>
        <div className="h-80 flex items-center justify-center text-gray-500">
          Bar Chart Placeholder - Coming Soon
        </div>
      </div>

      <DataTable
        columns={columns}
        data={performanceData}
        loading={isLoading}
        emptyMessage="No performance data found for this week"
      />
    </div>
  );
};

export default DriverPerformance;
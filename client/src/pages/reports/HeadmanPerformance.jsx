import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import WeekPicker from '../../components/shared/WeekPicker';
import DataTable from '../../components/shared/DataTable';
import { getHeadmanPerformance } from '../../api/reports';
import { formatCurrency, formatTons, getISOWeek } from '../../utils/formatters';

const HeadmanPerformance = () => {
  const currentDate = new Date();
  const [week, setWeek] = useState(getISOWeek(currentDate));
  const [year, setYear] = useState(currentDate.getFullYear());

  const { data: performance, isLoading } = useQuery({
    queryKey: ['headman-performance', week, year],
    queryFn: () => getHeadmanPerformance(week, year)
  });

  const handleWeekChange = (newWeek, newYear) => {
    setWeek(newWeek);
    setYear(newYear);
  };

  const performanceData = performance?.data || [];

  const columns = [
    { key: "rank", label: "Rank" },
    { key: "headman_name", label: "Headman" },
    { key: "supervisor_name", label: "Supervisor" },
    { key: "expected_tons", label: "Expected Tons", render: (v) => formatTons(v) },
    { key: "actual_tons", label: "Actual Tons", render: (v) => formatTons(v) },
    { key: "tonnage_diff", label: "Tonnage Diff", render: (v) => formatTons(v) },
    { 
      key: "performance_percentage", 
      label: "Performance %",
      render: (value) => {
        const percent = value || 0;
        let colorClass = 'text-gray-900';
        if (percent >= 100) colorClass = 'text-green-600 font-bold';
        else if (percent >= 85) colorClass = 'text-amber-600';
        else colorClass = 'text-red-600';
        
        return <span className={colorClass}>{percent.toFixed(1)}%</span>;
      }
    },
    { key: "weekly_net_pay", label: "Weekly Net Pay", render: (v) => formatCurrency(v) }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Headman Performance</h2>
      </div>

      <WeekPicker week={week} year={year} onChange={handleWeekChange} />

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Top 10 Headmen Performance</h3>
        <div className="h-80 flex items-center justify-center text-gray-500">
          Horizontal Bar Chart Placeholder - Coming Soon
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

export default HeadmanPerformance;
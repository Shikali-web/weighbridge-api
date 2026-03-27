import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import WeekPicker from '../../components/shared/WeekPicker';
import DataTable from '../../components/shared/DataTable';
import EmptyState from '../../components/shared/EmptyState';
import { Button } from '../../components/ui/button';
import { getHeadmanPerformance } from '../../api/reports';
import { formatCurrency, formatTons, getISOWeek } from '../../utils/formatters';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { ArrowLeft, Eye, Loader2 } from 'lucide-react';

const HeadmanPerformance = () => {
  const navigate = useNavigate();
  const currentDate = new Date();
  const [week, setWeek] = useState(getISOWeek(currentDate));
  const [year, setYear] = useState(currentDate.getFullYear());
  const [error, setError] = useState(null);
  const [isLoadingLocal, setIsLoadingLocal] = useState(false);

  const { data: performance, isLoading, error: queryError, refetch } = useQuery({
    queryKey: ['headman-performance', week, year],
    queryFn: async () => {
      try {
        setIsLoadingLocal(true);
        setError(null);
        const response = await getHeadmanPerformance(week, year);
        return response;
      } catch (err) {
        console.error('Error fetching headman performance:', err);
        setError(err.message || 'Failed to load data');
        throw err;
      } finally {
        setIsLoadingLocal(false);
      }
    },
    enabled: true,
    retry: 1,
  });

  useEffect(() => {
    if (queryError) {
      setError(queryError.message);
    }
  }, [queryError]);

  const handleWeekChange = (newWeek, newYear) => {
    setWeek(newWeek);
    setYear(newYear);
    refetch();
  };

  const handleViewDetails = (headmanId, headmanName) => {
    navigate(`/payroll/headman-details/${headmanId}?week=${week}&year=${year}&name=${encodeURIComponent(headmanName)}`);
  };

  const performanceData = performance?.data || [];

  // Prepare chart data (top 10)
  const chartData = performanceData.slice(0, 10).map((item, index) => ({
    rank: index + 1,
    name: item.headman_name?.length > 20 ? item.headman_name.substring(0, 17) + '...' : item.headman_name || 'Unknown',
    performance: Math.min(item.performance_percentage || 0, 150),
    actualTons: item.actual_tons || 0,
    expectedTons: item.expected_tons || 0,
    payment: item.weekly_pay || 0
  }));

  const getBarColor = (performance) => {
    if (performance >= 100) return '#22c55e';
    if (performance >= 85) return '#eab308';
    return '#ef4444';
  };

  const columns = [
    { key: "rank", label: "Rank", render: (_, row, idx) => idx + 1 },
    { key: "headman_name", label: "Headman", render: (v) => v || 'N/A' },
    { key: "supervisor_name", label: "Supervisor", render: (v) => v || 'N/A' },
    { key: "expected_tons", label: "Expected Tons", render: (v) => formatTons(v || 0) },
    { key: "actual_tons", label: "Actual Tons", render: (v) => formatTons(v || 0) },
    { 
      key: "tonnage_diff", 
      label: "Diff", 
      render: (v) => {
        const diff = v || 0;
        if (diff > 0) return <span className="text-green-600">↑ {formatTons(diff)}</span>;
        if (diff < 0) return <span className="text-red-600">↓ {formatTons(Math.abs(diff))}</span>;
        return formatTons(0);
      }
    },
    { 
      key: "performance_percentage", 
      label: "Performance %",
      render: (value) => {
        const percent = value || 0;
        let colorClass = 'text-gray-900';
        if (percent >= 100) colorClass = 'text-green-600 font-bold';
        else if (percent >= 85) colorClass = 'text-amber-600';
        else if (percent > 0) colorClass = 'text-red-600';
        else colorClass = 'text-gray-400';
        return <span className={colorClass}>{percent.toFixed(1)}%</span>;
      }
    },
    { key: "weekly_pay", label: "Weekly Pay", render: (v) => formatCurrency(v || 0) },
    {
      key: "actions",
      label: "Actions",
      render: (_, row) => (
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => handleViewDetails(row.headman_id, row.headman_name)}
          className="text-blue-600 hover:text-blue-800"
        >
          <Eye className="h-4 w-4 mr-1" />
          Details
        </Button>
      )
    }
  ];

  const handleGoBack = () => {
    navigate('/reports');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={handleGoBack} className="p-2">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Headman Performance</h2>
            <p className="text-sm text-gray-500 mt-1">Performance metrics by headman for the selected week</p>
          </div>
        </div>
      </div>

      <WeekPicker week={week} year={year} onChange={handleWeekChange} />

      {isLoadingLocal || isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2 text-gray-500">Loading performance data...</span>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-600 mb-2">Error loading performance data</p>
          <p className="text-sm text-red-500">{error}</p>
          <Button 
            onClick={() => refetch()} 
            className="mt-4 bg-primary text-white"
          >
            Try Again
          </Button>
        </div>
      ) : performanceData.length === 0 ? (
        <EmptyState 
          title="No Performance Data"
          subtitle={`No headman performance data found for week ${week}, ${year}. Add harvest assignments and loading records first.`}
        />
      ) : (
        <>
          {/* Performance Chart */}
          {chartData.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Top 10 Headmen Performance</h3>
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 120, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" domain={[0, 150]} label={{ value: 'Performance %', position: 'insideBottom', offset: -5 }} />
                    <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 12 }} />
                    <Tooltip 
                      formatter={(value, name) => {
                        if (name === 'performance') return [`${value.toFixed(1)}%`, 'Performance'];
                        return [value, name];
                      }}
                      labelFormatter={(label) => `Headman: ${label}`}
                    />
                    <Bar dataKey="performance" fill="#4caf7d" radius={[0, 4, 4, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={getBarColor(entry.performance)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p className="text-xs text-gray-500 text-center mt-2">
                Performance = (Actual Tons / Expected Tons) × 100% | Green: ≥100%, Yellow: 85-99%, Red: &lt;85%
              </p>
            </div>
          )}

          {/* Performance Table */}
          <DataTable
            columns={columns}
            data={performanceData}
            loading={isLoadingLocal || isLoading}
            emptyMessage="No headman performance data found for this week"
          />
        </>
      )}
    </div>
  );
};

export default HeadmanPerformance;
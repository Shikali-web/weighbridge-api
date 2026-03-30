import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Eye, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '../../components/ui/button';
import WeekPicker from '../../components/shared/WeekPicker';
import DataTable from '../../components/shared/DataTable';
import EmptyState from '../../components/shared/EmptyState';
import { formatCurrency, formatTons, getISOWeek } from '../../utils/formatters';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const HeadmanPerformance = () => {
  const navigate = useNavigate();
  const currentDate = new Date();
  const [week, setWeek] = useState(getISOWeek(currentDate));
  const [year, setYear] = useState(currentDate.getFullYear());
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`http://localhost:5000/api/reports/headman-performance?week=${week}&year=${year}`);
      const result = await response.json();
      console.log('Headman API Response:', result);
      if (result.success) {
        const parsedData = result.data.map(item => ({
          headman_id: item.headman_id,
          headman_name: item.headman_name || 'Unknown',
          supervisor_name: item.supervisor_name || 'No Supervisor',
          expected_tons: parseFloat(item.expected_tons) || 0,
          actual_tons: parseFloat(item.actual_tons) || 0,
          tonnage_diff: parseFloat(item.tonnage_diff) || 0,
          performance_percentage: parseFloat(item.performance_percentage) || 0,
          weekly_pay: parseFloat(item.weekly_pay) || 0,
          assignments_count: item.assignments_count || 0
        }));
        setData(parsedData);
      } else {
        setError(result.message || 'Failed to load data');
      }
    } catch (err) {
      console.error('Fetch error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [week, year]);

  const handleWeekChange = (newWeek, newYear) => {
    setWeek(newWeek);
    setYear(newYear);
  };

  const handleRefresh = () => {
    fetchData();
  };

  const handleViewDetails = (headmanId, headmanName) => {
    navigate(`/payroll/headman-details/${headmanId}?week=${week}&year=${year}&name=${encodeURIComponent(headmanName)}`);
  };

  const getBarColor = (performance) => {
    if (performance >= 100) return '#22c55e';
    if (performance >= 85) return '#eab308';
    return '#ef4444';
  };

  const columns = [
    { key: "rank", label: "Rank", render: (_, row, idx) => idx + 1 },
    { key: "headman_name", label: "Headman", render: (v) => v || 'N/A' },
    { key: "supervisor_name", label: "Supervisor", render: (v) => v || 'N/A' },
    { key: "expected_tons", label: "Expected Tons", render: (v) => formatTons(v) },
    { key: "actual_tons", label: "Actual Tons", render: (v) => formatTons(v) },
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
    { key: "weekly_pay", label: "Weekly Pay", render: (v) => formatCurrency(v) },
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

  const chartData = data.slice(0, 10).map((item, index) => ({
    rank: index + 1,
    name: item.headman_name?.length > 20 ? item.headman_name.substring(0, 17) + '...' : item.headman_name || 'Unknown',
    performance: Math.min(item.performance_percentage || 0, 150),
  }));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-gray-500">Loading headman performance data...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate('/reports')} className="p-2">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Headman Performance</h2>
              <p className="text-sm text-gray-500 mt-1">Performance metrics by headman for the selected week</p>
            </div>
          </div>
          <Button onClick={handleRefresh} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
        <WeekPicker week={week} year={year} onChange={handleWeekChange} />
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-600 mb-2">Error loading performance data</p>
          <p className="text-sm text-red-500">{error}</p>
          <Button onClick={fetchData} className="mt-4 bg-primary text-white">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  const totalTrips = data.reduce((sum, item) => sum + (item.assignments_count || 0), 0);
  const totalTons = data.reduce((sum, item) => sum + (item.actual_tons || 0), 0);
  const totalPay = data.reduce((sum, item) => sum + (item.weekly_pay || 0), 0);
  const avgPerformance = data.length > 0 ? data.reduce((sum, item) => sum + (item.performance_percentage || 0), 0) / data.length : 0;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/reports')} className="p-2">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Headman Performance</h2>
            <p className="text-sm text-gray-500 mt-1">Performance metrics by headman for the selected week</p>
          </div>
        </div>
        <Button onClick={handleRefresh} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <WeekPicker week={week} year={year} onChange={handleWeekChange} />

      {data.length === 0 ? (
        <EmptyState 
          title="No Performance Data"
          subtitle={`No headman performance data found for week ${week}, ${year}. Complete harvest assignments first.`}
        />
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-500">Active Headmen</p>
              <p className="text-2xl font-bold">{data.length}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-500">Avg Performance</p>
              <p className="text-2xl font-bold text-primary">{avgPerformance.toFixed(1)}%</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-500">Total Tons</p>
              <p className="text-2xl font-bold text-green-600">{formatTons(totalTons)}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-500">Total Payroll</p>
              <p className="text-2xl font-bold text-primary">{formatCurrency(totalPay)}</p>
            </div>
          </div>

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
                    <Tooltip formatter={(value) => [`${value.toFixed(1)}%`, 'Performance']} />
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
            data={data}
            loading={loading}
            emptyMessage="No headman performance data found for this week"
          />
        </>
      )}
    </div>
  );
};

export default HeadmanPerformance;
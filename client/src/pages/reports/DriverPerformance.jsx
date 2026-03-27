import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Eye, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '../../components/ui/button';
import WeekPicker from '../../components/shared/WeekPicker';
import DataTable from '../../components/shared/DataTable';
import EmptyState from '../../components/shared/EmptyState';
import { formatCurrency, formatTons, getISOWeek } from '../../utils/formatters';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const DriverPerformance = () => {
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
      const response = await fetch(`http://localhost:5000/api/reports/driver-performance?week=${week}&year=${year}`);
      const result = await response.json();
      console.log('Driver API Response:', result);
      if (result.success) {
        // Parse the data - handle string values from API
        const parsedData = result.data.map(item => ({
          driver_id: item.driver_id,
          driver_name: item.driver_name || 'Unknown',
          truck_plate: item.truck_plate || 'N/A',
          total_trips: parseInt(item.total_trips) || 0,
          total_tons: parseFloat(item.total_tons) || 0,
          weekly_pay: parseFloat(item.weekly_pay) || 0,
          rank: parseInt(item.rank) || 0
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

  const handleViewDetails = (driverId, driverName) => {
    navigate(`/payroll/driver-details/${driverId}?week=${week}&year=${year}&name=${encodeURIComponent(driverName)}`);
  };

  const getBarColor = (tons, maxTons) => {
    if (tons >= maxTons * 0.8) return '#22c55e';
    if (tons >= maxTons * 0.5) return '#eab308';
    return '#ef4444';
  };

  const columns = [
    { key: "rank", label: "Rank", render: (_, row, idx) => idx + 1 },
    { key: "driver_name", label: "Driver", render: (v) => v || 'N/A' },
    { key: "truck_plate", label: "Truck", render: (v) => v || 'N/A' },
    { key: "total_trips", label: "Total Trips", render: (v) => v || 0 },
    { key: "total_tons", label: "Total Tons", render: (v) => formatTons(v || 0) },
    { key: "weekly_pay", label: "Weekly Pay", render: (v) => formatCurrency(v || 0) },
    {
      key: "actions",
      label: "Actions",
      render: (_, row) => (
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => handleViewDetails(row.driver_id, row.driver_name)}
          className="text-blue-600 hover:text-blue-800"
        >
          <Eye className="h-4 w-4 mr-1" />
          Details
        </Button>
      )
    }
  ];

  // Prepare chart data
  const maxTons = Math.max(...data.map(item => item.total_tons || 0), 1);
  const chartData = data.slice(0, 10).map((item, index) => ({
    rank: index + 1,
    name: item.driver_name?.length > 20 ? item.driver_name.substring(0, 17) + '...' : item.driver_name || 'Unknown',
    tons: item.total_tons || 0,
    trips: item.total_trips || 0,
    pay: item.weekly_pay || 0
  }));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-gray-500">Loading driver performance data...</span>
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
              <h2 className="text-2xl font-bold text-gray-900">Driver Performance</h2>
              <p className="text-sm text-gray-500 mt-1">Performance metrics by driver for the selected week</p>
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

  const totalTrips = data.reduce((sum, item) => sum + (item.total_trips || 0), 0);
  const totalTons = data.reduce((sum, item) => sum + (item.total_tons || 0), 0);
  const totalPay = data.reduce((sum, item) => sum + (item.weekly_pay || 0), 0);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/reports')} className="p-2">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Driver Performance</h2>
            <p className="text-sm text-gray-500 mt-1">Performance metrics by driver for the selected week</p>
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
          subtitle={`No driver performance data found for week ${week}, ${year}. Add transport trips first.`}
        />
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-500">Active Drivers</p>
              <p className="text-2xl font-bold">{data.length}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-500">Total Trips</p>
              <p className="text-2xl font-bold text-primary">{totalTrips}</p>
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

          {/* Performance Chart - Tons per Driver */}
          {chartData.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Top 10 Drivers by Tons Transported</h3>
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 120, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" label={{ value: 'Tons Transported', position: 'insideBottom', offset: -5 }} />
                    <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(value, name) => {
                      if (name === 'tons') return [formatTons(value), 'Tons'];
                      return [value, name];
                    }} />
                    <Bar dataKey="tons" fill="#f59e0b" radius={[0, 4, 4, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={getBarColor(entry.tons, maxTons)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p className="text-xs text-gray-500 text-center mt-2">
                Total tons transported per driver | Dark Green: Top 20%, Yellow: Middle 50%, Red: Bottom 30%
              </p>
            </div>
          )}

          {/* Performance Table */}
          <DataTable
            columns={columns}
            data={data}
            loading={loading}
            emptyMessage="No driver performance data found for this week"
          />
        </>
      )}
    </div>
  );
};

export default DriverPerformance;
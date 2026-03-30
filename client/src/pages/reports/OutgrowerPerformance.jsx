import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Loader2, Users, Scale, Truck, Calendar, TrendingUp, Eye } from 'lucide-react';
import { Button } from '../../components/ui/button';
import WeekPicker from '../../components/shared/WeekPicker';
import DataTable from '../../components/shared/DataTable';
import EmptyState from '../../components/shared/EmptyState';
import { formatCurrency, formatTons, getISOWeek, getWeekDates } from '../../utils/formatters';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, LineChart, Line } from 'recharts';

const OutgrowerPerformance = () => {
  const navigate = useNavigate();
  const currentDate = new Date();
  const [week, setWeek] = useState(getISOWeek(currentDate));
  const [year, setYear] = useState(currentDate.getFullYear());
  const [viewType, setViewType] = useState('weekly'); // 'weekly' or 'daily'
  const [selectedDate, setSelectedDate] = useState(currentDate.toISOString().split('T')[0]);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [summary, setSummary] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      let endpoint;
      if (viewType === 'weekly') {
        endpoint = `http://localhost:5000/api/reports/outgrower-weekly?week=${week}&year=${year}`;
      } else {
        endpoint = `http://localhost:5000/api/reports/outgrower-daily?date=${selectedDate}`;
      }
      
      const response = await fetch(endpoint);
      const result = await response.json();
      console.log('Outgrower API Response:', result);
      
      if (result.success) {
        const parsedData = result.data.map(item => ({
          ...item,
          total_harvest: parseFloat(item.total_harvest) || 0,
          total_loaded: parseFloat(item.total_loaded) || 0,
          total_transported: parseFloat(item.total_transported) || 0,
          trips: parseInt(item.trips) || 0,
          harvest_revenue: parseFloat(item.harvest_revenue) || 0,
          loading_revenue: parseFloat(item.loading_revenue) || 0,
          transport_revenue: parseFloat(item.transport_revenue) || 0,
          total_revenue: parseFloat(item.total_revenue) || 0,
        }));
        setData(parsedData);
        
        // Calculate summary
        const totalHarvest = parsedData.reduce((sum, o) => sum + o.total_harvest, 0);
        const totalLoaded = parsedData.reduce((sum, o) => sum + o.total_loaded, 0);
        const totalTransported = parsedData.reduce((sum, o) => sum + o.total_transported, 0);
        const totalTrips = parsedData.reduce((sum, o) => sum + o.trips, 0);
        const totalRevenue = parsedData.reduce((sum, o) => sum + o.total_revenue, 0);
        
        setSummary({
          total_outgrowers: parsedData.length,
          total_harvest: totalHarvest,
          total_loaded: totalLoaded,
          total_transported: totalTransported,
          total_trips: totalTrips,
          total_revenue: totalRevenue,
          avg_harvest_per_outgrower: parsedData.length > 0 ? totalHarvest / parsedData.length : 0,
        });
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
  }, [week, year, selectedDate, viewType]);

  const handleWeekChange = (newWeek, newYear) => {
    setWeek(newWeek);
    setYear(newYear);
  };

  const handleDateChange = (e) => {
    setSelectedDate(e.target.value);
  };

  const handleExport = () => {
    const headers = ['Outgrower', 'Field Code', 'Harvest (T)', 'Loaded (T)', 'Transported (T)', 'Trips', 'Total Revenue'];
    const rows = data.map(o => [
      o.outgrower_name,
      o.field_code,
      o.total_harvest,
      o.total_loaded,
      o.total_transported,
      o.trips,
      o.total_revenue
    ]);
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `outgrower_report_${viewType}_${viewType === 'weekly' ? `week${week}_${year}` : selectedDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const columns = [
    { key: "rank", label: "Rank", render: (_, row, idx) => idx + 1 },
    { key: "outgrower_name", label: "Outgrower", render: (v) => v || 'N/A' },
    { key: "field_code", label: "Field Code", render: (v) => v || 'N/A' },
    { key: "total_harvest", label: "Harvested (T)", render: (v) => formatTons(v) },
    { key: "total_loaded", label: "Loaded (T)", render: (v) => formatTons(v) },
    { key: "total_transported", label: "Transported (T)", render: (v) => formatTons(v) },
    { key: "trips", label: "Trips", render: (v) => v || 0 },
    { key: "total_revenue", label: "Total Revenue", render: (v) => formatCurrency(v) },
    {
      key: "actions",
      label: "Actions",
      render: (_, row) => (
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => navigate(`/reports/outgrower-details/${row.outgrower_id}?week=${week}&year=${year}`)}
          className="text-blue-600 hover:text-blue-800"
        >
          <Eye className="h-4 w-4 mr-1" />
          Details
        </Button>
      )
    }
  ];

  // Chart data
  const chartData = data.slice(0, 10).map((item, index) => ({
    name: item.outgrower_name?.length > 15 ? item.outgrower_name.substring(0, 12) + '...' : item.outgrower_name,
    harvest: item.total_harvest,
    loaded: item.total_loaded,
    transported: item.total_transported,
  }));

  const revenueChartData = data.slice(0, 10).map(item => ({
    name: item.outgrower_name?.length > 15 ? item.outgrower_name.substring(0, 12) + '...' : item.outgrower_name,
    revenue: item.total_revenue,
  }));

  const weekDates = getWeekDates(week, year);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-gray-500">Loading outgrower performance data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/reports')} className="p-2">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Outgrower Performance</h2>
            <p className="text-sm text-gray-500 mt-1">Track tonnages and operations by outgrower</p>
          </div>
        </div>
        <Button onClick={handleExport} variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* View Type Toggle */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex gap-2">
            <Button
              variant={viewType === 'weekly' ? 'default' : 'outline'}
              onClick={() => setViewType('weekly')}
              className={viewType === 'weekly' ? 'bg-primary text-white' : ''}
            >
              <Calendar className="h-4 w-4 mr-2" />
              Weekly View
            </Button>
            <Button
              variant={viewType === 'daily' ? 'default' : 'outline'}
              onClick={() => setViewType('daily')}
              className={viewType === 'daily' ? 'bg-primary text-white' : ''}
            >
              <Calendar className="h-4 w-4 mr-2" />
              Daily View
            </Button>
          </div>
          
          {viewType === 'weekly' ? (
            <WeekPicker week={week} year={year} onChange={handleWeekChange} />
          ) : (
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-500" />
              <input
                type="date"
                value={selectedDate}
                onChange={handleDateChange}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          )}
        </div>
      </div>

      {error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-600">Error: {error}</p>
          <Button onClick={fetchData} className="mt-4 bg-primary text-white">Try Again</Button>
        </div>
      ) : data.length === 0 ? (
        <EmptyState 
          title="No Data Available"
          subtitle={`No outgrower data found for ${viewType === 'weekly' ? `week ${week}, ${year}` : selectedDate}. Add harvest and loading records first.`}
        />
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center gap-2 text-gray-500 mb-2">
                <Users className="h-4 w-4" />
                <span className="text-sm">Active Outgrowers</span>
              </div>
              <p className="text-2xl font-bold">{summary.total_outgrowers}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center gap-2 text-gray-500 mb-2">
                <Scale className="h-4 w-4" />
                <span className="text-sm">Total Harvested</span>
              </div>
              <p className="text-2xl font-bold text-green-600">{formatTons(summary.total_harvest)}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center gap-2 text-gray-500 mb-2">
                <Truck className="h-4 w-4" />
                <span className="text-sm">Total Loaded</span>
              </div>
              <p className="text-2xl font-bold text-blue-600">{formatTons(summary.total_loaded)}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center gap-2 text-gray-500 mb-2">
                <TrendingUp className="h-4 w-4" />
                <span className="text-sm">Total Revenue</span>
              </div>
              <p className="text-2xl font-bold text-primary">{formatCurrency(summary.total_revenue)}</p>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Top 10 Outgrowers by Tonnage</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 100, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" label={{ value: 'Tons', position: 'insideBottom', offset: -5 }} />
                    <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(value) => formatTons(value)} />
                    <Bar dataKey="harvest" fill="#22c55e" name="Harvested" />
                    <Bar dataKey="loaded" fill="#3b82f6" name="Loaded" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Top 10 Outgrowers by Revenue</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={revenueChartData} layout="vertical" margin={{ top: 5, right: 30, left: 100, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" tickFormatter={(value) => `KES ${(value / 1000).toFixed(0)}K`} />
                    <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                    <Bar dataKey="revenue" fill="#f59e0b" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Detailed Table */}
          <DataTable
            columns={columns}
            data={data}
            loading={loading}
            emptyMessage="No outgrower data found"
          />
        </>
      )}
    </div>
  );
};

export default OutgrowerPerformance;
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Calendar, Scale, Truck, TrendingUp, Loader2, Download } from 'lucide-react';
import { Button } from '../../components/ui/button';
import WeekPicker from '../../components/shared/WeekPicker';
import DataTable from '../../components/shared/DataTable';
import { formatCurrency, formatTons, getISOWeek } from '../../utils/formatters';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';

const OutgrowerDetails = () => {
  const { outgrowerId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const initialWeek = queryParams.get('week') || getISOWeek(new Date());
  const initialYear = queryParams.get('year') || new Date().getFullYear();
  
  const [week, setWeek] = useState(parseInt(initialWeek));
  const [year, setYear] = useState(parseInt(initialYear));
  const [data, setData] = useState(null);
  const [dailyData, setDailyData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [outgrowerName, setOutgrowerName] = useState('');

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch weekly summary
      const weeklyResponse = await fetch(`http://localhost:5000/api/reports/outgrower-weekly-details?outgrower_id=${outgrowerId}&week=${week}&year=${year}`);
      const weeklyResult = await weeklyResponse.json();
      
      // Fetch daily breakdown
      const dailyResponse = await fetch(`http://localhost:5000/api/reports/outgrower-daily-details?outgrower_id=${outgrowerId}&week=${week}&year=${year}`);
      const dailyResult = await dailyResponse.json();
      
      if (weeklyResult.success) {
        setData(weeklyResult.data);
        setOutgrowerName(weeklyResult.data.outgrower_name || 'Outgrower');
      }
      if (dailyResult.success) {
        setDailyData(dailyResult.data);
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
  }, [outgrowerId, week, year]);

  const handleWeekChange = (newWeek, newYear) => {
    setWeek(newWeek);
    setYear(newYear);
  };

  const handleExport = () => {
    const headers = ['Date', 'Harvested (T)', 'Loaded (T)', 'Transported (T)', 'Trips', 'Revenue'];
    const rows = dailyData.map(d => [
      d.date,
      d.harvested,
      d.loaded,
      d.transported,
      d.trips,
      d.revenue
    ]);
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${outgrowerName}_week${week}_${year}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const columns = [
    { key: "date", label: "Date", render: (v) => new Date(v).toLocaleDateString() },
    { key: "harvested", label: "Harvested (T)", render: (v) => formatTons(v || 0) },
    { key: "loaded", label: "Loaded (T)", render: (v) => formatTons(v || 0) },
    { key: "transported", label: "Transported (T)", render: (v) => formatTons(v || 0) },
    { key: "trips", label: "Trips", render: (v) => v || 0 },
    { key: "revenue", label: "Revenue", render: (v) => formatCurrency(v || 0) }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-gray-500">Loading outgrower details...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/reports/outgrower-performance')} className="p-2">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{outgrowerName} - Details</h2>
            <p className="text-sm text-gray-500 mt-1">Weekly performance breakdown</p>
          </div>
        </div>
        <Button onClick={handleExport} variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>

      <WeekPicker week={week} year={year} onChange={handleWeekChange} />

      {error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-600">Error: {error}</p>
          <Button onClick={fetchData} className="mt-4 bg-primary text-white">Try Again</Button>
        </div>
      ) : !data ? (
        <EmptyState 
          title="No Data Available"
          subtitle={`No data found for this outgrower in week ${week}, ${year}`}
        />
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center gap-2 text-gray-500 mb-2">
                <Scale className="h-4 w-4" />
                <span className="text-sm">Total Harvested</span>
              </div>
              <p className="text-2xl font-bold text-green-600">{formatTons(data.total_harvest || 0)}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center gap-2 text-gray-500 mb-2">
                <Truck className="h-4 w-4" />
                <span className="text-sm">Total Loaded</span>
              </div>
              <p className="text-2xl font-bold text-blue-600">{formatTons(data.total_loaded || 0)}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center gap-2 text-gray-500 mb-2">
                <Truck className="h-4 w-4" />
                <span className="text-sm">Total Transported</span>
              </div>
              <p className="text-2xl font-bold text-amber-600">{formatTons(data.total_transported || 0)}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center gap-2 text-gray-500 mb-2">
                <TrendingUp className="h-4 w-4" />
                <span className="text-sm">Total Revenue</span>
              </div>
              <p className="text-2xl font-bold text-primary">{formatCurrency(data.total_revenue || 0)}</p>
            </div>
          </div>

          {/* Daily Trend Chart */}
          {dailyData.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Daily Performance Trend</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dailyData}>
                    <defs>
                      <linearGradient id="colorHarvest" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorLoaded" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tickFormatter={(v) => new Date(v).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} />
                    <YAxis />
                    <Tooltip formatter={(value) => formatTons(value)} />
                    <Area type="monotone" dataKey="harvested" stroke="#22c55e" fillOpacity={1} fill="url(#colorHarvest)" name="Harvested" />
                    <Area type="monotone" dataKey="loaded" stroke="#3b82f6" fillOpacity={1} fill="url(#colorLoaded)" name="Loaded" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Daily Breakdown Table */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Daily Breakdown</h3>
            <DataTable
              columns={columns}
              data={dailyData}
              loading={loading}
              emptyMessage="No daily data available"
            />
          </div>
        </>
      )}
    </div>
  );
};

export default OutgrowerDetails;
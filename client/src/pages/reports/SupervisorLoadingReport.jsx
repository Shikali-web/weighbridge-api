import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Loader2, Truck, Users, Scale, DollarSign } from 'lucide-react';
import { Button } from '../../components/ui/button';
import WeekPicker from '../../components/shared/WeekPicker';
import DataTable from '../../components/shared/DataTable';
import { formatCurrency, formatTons, getISOWeek } from '../../utils/formatters';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const SupervisorLoadingReport = () => {
  const navigate = useNavigate();
  const currentDate = new Date();
  const [week, setWeek] = useState(getISOWeek(currentDate));
  const [year, setYear] = useState(currentDate.getFullYear());
  const [data, setData] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`http://localhost:5000/api/reports/supervisor-performance?week=${week}&year=${year}`);
      const result = await response.json();
      if (result.success) {
        const parsedData = result.data.map(item => ({
          ...item,
          total_tons: parseFloat(item.total_tons) || 0,
          total_trips: parseInt(item.total_trips) || 0,
          weekly_pay: parseFloat(item.weekly_pay) || 0,
        }));
        setData(parsedData);
        
        const totalTrips = parsedData.reduce((sum, s) => sum + s.total_trips, 0);
        const totalTons = parsedData.reduce((sum, s) => sum + s.total_tons, 0);
        const totalPay = parsedData.reduce((sum, s) => sum + s.weekly_pay, 0);
        const avgTripsPerSupervisor = parsedData.length > 0 ? totalTrips / parsedData.length : 0;
        
        setSummary({
          total_trips: totalTrips,
          total_tons: totalTons,
          total_pay: totalPay,
          active_supervisors: parsedData.length,
          avg_trips_per_supervisor: avgTripsPerSupervisor,
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
  }, [week, year]);

  const handleWeekChange = (newWeek, newYear) => {
    setWeek(newWeek);
    setYear(newYear);
  };

  const handleExport = () => {
    const headers = ['Supervisor', 'Total Trips', 'Total Tons', 'Weekly Pay', 'Assignments Supervised'];
    const rows = data.map(s => [
      s.supervisor_name,
      s.total_trips,
      s.total_tons,
      s.weekly_pay,
      s.assignments_supervised
    ]);
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `supervisor_loading_report_week${week}_${year}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const chartData = data.slice(0, 10).map(item => ({
    name: item.supervisor_name?.length > 15 ? item.supervisor_name.substring(0, 12) + '...' : item.supervisor_name,
    trips: item.total_trips,
    tons: item.total_tons,
  }));

  const columns = [
    { key: "supervisor_name", label: "Supervisor", render: (v) => v || 'N/A' },
    { key: "total_trips", label: "Total Trips", render: (v) => v || 0 },
    { key: "total_tons", label: "Total Tons", render: (v) => formatTons(v) },
    { key: "weekly_pay", label: "Weekly Pay", render: (v) => formatCurrency(v) },
    { key: "assignments_supervised", label: "Assignments", render: (v) => v || 0 }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-gray-500">Loading supervisor loading report...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/reports')} className="p-2">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Supervisor Loading Report</h2>
            <p className="text-sm text-gray-500 mt-1">Loading performance by supervisor</p>
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
      ) : data.length === 0 ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-8 text-center">
          <p className="text-yellow-800">No loading data found for week {week}, {year}</p>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center gap-2 text-gray-500 mb-2">
                <Users className="h-4 w-4" />
                <span className="text-sm">Active Supervisors</span>
              </div>
              <p className="text-2xl font-bold">{summary.active_supervisors}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center gap-2 text-gray-500 mb-2">
                <Truck className="h-4 w-4" />
                <span className="text-sm">Total Trips</span>
              </div>
              <p className="text-2xl font-bold">{summary.total_trips}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center gap-2 text-gray-500 mb-2">
                <Scale className="h-4 w-4" />
                <span className="text-sm">Total Tons Loaded</span>
              </div>
              <p className="text-2xl font-bold text-green-600">{formatTons(summary.total_tons)}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center gap-2 text-gray-500 mb-2">
                <DollarSign className="h-4 w-4" />
                <span className="text-sm">Total Payroll</span>
              </div>
              <p className="text-2xl font-bold text-primary">{formatCurrency(summary.total_pay)}</p>
            </div>
          </div>

          {/* Trips per Supervisor Chart */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Top 10 Supervisors by Trips</h3>
            <div className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 120, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" label={{ value: 'Number of Trips', position: 'insideBottom', offset: -5 }} />
                  <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value) => [`${value} trips`, 'Trips']} />
                  <Bar dataKey="trips" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Detailed Table */}
          <DataTable
            columns={columns}
            data={data}
            loading={loading}
            emptyMessage="No supervisor loading data found"
          />
        </>
      )}
    </div>
  );
};

export default SupervisorLoadingReport;
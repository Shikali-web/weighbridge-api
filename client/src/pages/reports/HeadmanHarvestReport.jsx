import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Eye, Loader2, Users, Scale, Truck } from 'lucide-react';
import { Button } from '../../components/ui/button';
import WeekPicker from '../../components/shared/WeekPicker';
import DataTable from '../../components/shared/DataTable';
import { formatCurrency, formatTons, getISOWeek } from '../../utils/formatters';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Cell as PieCell } from 'recharts';

const HeadmanHarvestReport = () => {
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
      const response = await fetch(`http://localhost:5000/api/reports/headman-performance?week=${week}&year=${year}`);
      const result = await response.json();
      console.log('Headman Report Response:', result);
      if (result.success) {
        const parsedData = result.data.map(item => ({
          ...item,
          expected_tons: parseFloat(item.expected_tons) || 0,
          actual_tons: parseFloat(item.actual_tons) || 0,
          tonnage_diff: parseFloat(item.tonnage_diff) || 0,
          performance_percentage: parseFloat(item.performance_percentage) || 0,
          weekly_pay: parseFloat(item.weekly_pay) || 0,
        }));
        setData(parsedData);
        
        // Calculate summary
        const totalExpected = parsedData.reduce((sum, h) => sum + h.expected_tons, 0);
        const totalActual = parsedData.reduce((sum, h) => sum + h.actual_tons, 0);
        const totalPay = parsedData.reduce((sum, h) => sum + h.weekly_pay, 0);
        const avgPerformance = parsedData.length > 0 
          ? parsedData.reduce((sum, h) => sum + h.performance_percentage, 0) / parsedData.length 
          : 0;
        
        setSummary({
          total_expected: totalExpected,
          total_actual: totalActual,
          total_pay: totalPay,
          avg_performance: avgPerformance,
          total_headmen: parsedData.length,
          above_expectation: parsedData.filter(h => h.performance_percentage >= 100).length,
          below_expectation: parsedData.filter(h => h.performance_percentage < 100 && h.performance_percentage > 0).length,
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
    // Export to CSV
    const headers = ['Headman', 'Supervisor', 'Expected Tons', 'Actual Tons', 'Difference', 'Performance %', 'Weekly Pay'];
    const rows = data.map(h => [
      h.headman_name,
      h.supervisor_name,
      h.expected_tons,
      h.actual_tons,
      h.tonnage_diff,
      h.performance_percentage.toFixed(1),
      h.weekly_pay
    ]);
    
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `headman_harvest_report_week${week}_${year}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const chartData = data.slice(0, 10).map(item => ({
    name: item.headman_name?.length > 15 ? item.headman_name.substring(0, 12) + '...' : item.headman_name,
    actual: item.actual_tons,
    expected: item.expected_tons,
    performance: item.performance_percentage
  }));

  const pieData = [
    { name: 'Above Expectation (≥100%)', value: summary?.above_expectation || 0, color: '#22c55e' },
    { name: 'Below Expectation (<100%)', value: summary?.below_expectation || 0, color: '#ef4444' },
  ];

  const columns = [
    { key: "headman_name", label: "Headman", render: (v) => v || 'N/A' },
    { key: "supervisor_name", label: "Supervisor", render: (v) => v || 'N/A' },
    { key: "expected_tons", label: "Expected Tons", render: (v) => formatTons(v) },
    { key: "actual_tons", label: "Actual Tons", render: (v) => formatTons(v) },
    { 
      key: "tonnage_diff", 
      label: "Difference",
      render: (v) => v > 0 ? <span className="text-green-600">+{formatTons(v)}</span> : v < 0 ? <span className="text-red-600">{formatTons(v)}</span> : formatTons(0)
    },
    { 
      key: "performance_percentage", 
      label: "Performance",
      render: (v) => {
        const color = v >= 100 ? 'text-green-600' : v >= 85 ? 'text-amber-600' : 'text-red-600';
        return <span className={`font-bold ${color}`}>{v.toFixed(1)}%</span>;
      }
    },
    { key: "weekly_pay", label: "Weekly Pay", render: (v) => formatCurrency(v) },
    { key: "assignments_count", label: "Assignments", render: (v) => v || 0 }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-gray-500">Loading headman harvest report...</span>
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
            <h2 className="text-2xl font-bold text-gray-900">Headman Harvest Report</h2>
            <p className="text-sm text-gray-500 mt-1">Detailed harvest performance by headman</p>
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
          <p className="text-yellow-800">No harvest data found for week {week}, {year}</p>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center gap-2 text-gray-500 mb-2">
                <Scale className="h-4 w-4" />
                <span className="text-sm">Total Expected</span>
              </div>
              <p className="text-2xl font-bold">{formatTons(summary.total_expected)}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center gap-2 text-gray-500 mb-2">
                <Scale className="h-4 w-4 text-green-600" />
                <span className="text-sm">Total Actual</span>
              </div>
              <p className="text-2xl font-bold text-green-600">{formatTons(summary.total_actual)}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center gap-2 text-gray-500 mb-2">
                <Users className="h-4 w-4" />
                <span className="text-sm">Active Headmen</span>
              </div>
              <p className="text-2xl font-bold">{summary.total_headmen}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center gap-2 text-gray-500 mb-2">
                <Truck className="h-4 w-4" />
                <span className="text-sm">Total Payroll</span>
              </div>
              <p className="text-2xl font-bold text-primary">{formatCurrency(summary.total_pay)}</p>
            </div>
          </div>

          {/* Performance Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Distribution</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {pieData.map((entry, index) => (
                        <PieCell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <p className="text-center text-sm text-gray-500 mt-2">
                {summary.above_expectation} headmen met or exceeded expectations
              </p>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Top 10 Headmen by Performance</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 100, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" domain={[0, 150]} label={{ value: 'Performance %', position: 'insideBottom', offset: -5 }} />
                    <YAxis type="category" dataKey="name" width={100} />
                    <Tooltip formatter={(value) => [`${value.toFixed(1)}%`, 'Performance']} />
                    <Bar dataKey="performance" fill="#4caf7d">
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.performance >= 100 ? '#22c55e' : entry.performance >= 85 ? '#eab308' : '#ef4444'} />
                      ))}
                    </Bar>
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
            emptyMessage="No headman harvest data found"
          />
        </>
      )}
    </div>
  );
};

export default HeadmanHarvestReport;
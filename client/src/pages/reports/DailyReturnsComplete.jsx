import React, { useState, useEffect } from 'react';
import { Calendar, TrendingUp, Truck, Scale, DollarSign, Package, Users, BarChart3, PieChart } from 'lucide-react';
import DataTable from '../../components/shared/DataTable';
import EmptyState from '../../components/shared/EmptyState';
import { formatCurrency, formatTons } from '../../utils/formatters';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RePieChart, Pie, Cell } from 'recharts';

const DailyReturnsComplete = () => {
  const [selectedDate, setSelectedDate] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [availableDates, setAvailableDates] = useState([]);

  // Fetch available dates on component mount
  useEffect(() => {
    const fetchAvailableDates = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/reports/available-dates');
        const result = await response.json();
        if (result.success && result.data.length > 0) {
          setAvailableDates(result.data);
          setSelectedDate(result.data[0]);
        }
      } catch (err) {
        console.error('Error fetching dates:', err);
      }
    };
    fetchAvailableDates();
  }, []);

  // Fetch data when date changes
  useEffect(() => {
    if (selectedDate) {
      fetchData();
    }
  }, [selectedDate]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`http://localhost:5000/api/reports/daily-working?date=${selectedDate}`);
      const result = await response.json();
      console.log('Daily Returns Data:', result);
      
      if (result.success) {
        setData(result.data);
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

  const handleDateChange = (e) => {
    setSelectedDate(e.target.value);
  };

  const formatDate = (date) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-KE', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const harvestColumns = [
    { key: "id", label: "ID", width: 60 },
    { key: "headman_name", label: "Headman", render: (v) => v || '-' },
    { key: "field_code", label: "Field", render: (v) => v || '-' },
    { key: "turnup", label: "Turnup", render: (v) => v || 0 },
    { key: "expected_tonnage", label: "Expected (T)", render: (v) => formatTons(v || 0) },
    { key: "status", label: "Status", render: (v) => {
      const statusClass = v === 'completed' ? 'bg-green-100 text-green-800' : 
                          v === 'in_progress' ? 'bg-blue-100 text-blue-800' : 
                          'bg-yellow-100 text-yellow-800';
      return <span className={`px-2 py-1 text-xs rounded-full ${statusClass}`}>{v?.toUpperCase() || 'PENDING'}</span>;
    }}
  ];

  const loadingColumns = [
    { key: "id", label: "ID", width: 60 },
    { key: "outgrower_name", label: "Outgrower", render: (v) => v || '-' },
    { key: "field_code", label: "Field", render: (v) => v || '-' },
    { key: "weighbridge_name", label: "Weighbridge", render: (v) => v || '-' },
    { key: "supervisor_name", label: "Supervisor", render: (v) => v || '-' },
    { key: "tons_loaded", label: "Tons", render: (v) => formatTons(v || 0) },
    { key: "trip_count", label: "Trips", render: (v) => v || 0 }
  ];

  const transportColumns = [
    { key: "id", label: "ID", width: 60 },
    { key: "plate_no", label: "Truck", render: (v) => v || '-' },
    { key: "driver_name", label: "Driver", render: (v) => v || '-' },
    { key: "outgrower_name", label: "Outgrower", render: (v) => v || '-' },
    { key: "band_code", label: "Band", render: (v) => v || '-' },
    { key: "tons_transported", label: "Tons", render: (v) => formatTons(v || 0) },
    { key: "total_revenue", label: "Revenue", render: (v) => formatCurrency(v || 0) }
  ];

  // Prepare chart data
  const revenueChartData = data ? [
    { name: 'Harvest', value: data.harvest_revenue || 0, color: '#22c55e' },
    { name: 'Loading', value: data.loading_revenue || 0, color: '#3b82f6' },
    { name: 'Transport', value: data.transport_revenue || 0, color: '#f59e0b' }
  ] : [];

  const tonnageChartData = data ? [
    { name: 'Harvest', tons: data.harvest_total || 0, color: '#22c55e' },
    { name: 'Loading', tons: data.loading_total || 0, color: '#3b82f6' },
    { name: 'Transport', tons: data.transport_total || 0, color: '#f59e0b' }
  ] : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading daily returns...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900">Daily Returns</h2>
          <div className="flex items-center gap-2 bg-white rounded-lg shadow px-4 py-2">
            <Calendar className="h-5 w-5 text-gray-500" />
            <select
              value={selectedDate}
              onChange={handleDateChange}
              className="border-none focus:outline-none py-1"
            >
              {availableDates.map(date => (
                <option key={date} value={date}>{formatDate(date)}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-600 font-medium mb-2">Error loading data</p>
          <p className="text-sm text-red-500">{error}</p>
          <button 
            onClick={fetchData} 
            className="mt-4 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const hasData = data && (data.harvest_count > 0 || data.loading_count > 0 || data.transport_count > 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Daily Returns</h2>
          <p className="text-sm text-gray-500 mt-1">{selectedDate ? formatDate(selectedDate) : 'Select a date'}</p>
        </div>
        <div className="flex items-center gap-2 bg-white rounded-lg shadow px-4 py-2">
          <Calendar className="h-5 w-5 text-gray-500" />
          <select
            value={selectedDate}
            onChange={handleDateChange}
            className="border-none focus:outline-none py-1"
          >
            {availableDates.map(date => (
              <option key={date} value={date}>{formatDate(date)}</option>
            ))}
          </select>
        </div>
      </div>

      {!hasData ? (
        <EmptyState 
          title="No Data Available"
          subtitle={`No records found for ${selectedDate ? formatDate(selectedDate) : 'the selected date'}. Try selecting a different date from the dropdown.`}
        />
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Harvest</p>
                  <p className="text-2xl font-bold">{data.harvest_count}</p>
                  <p className="text-xs text-gray-500">{formatTons(data.harvest_total)} tons</p>
                  <p className="text-xs text-green-600 mt-1">{formatCurrency(data.harvest_revenue)}</p>
                </div>
                <Scale className="h-8 w-8 text-green-500" />
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Loading</p>
                  <p className="text-2xl font-bold">{data.loading_count}</p>
                  <p className="text-xs text-gray-500">{formatTons(data.loading_total)} tons</p>
                  <p className="text-xs text-blue-600 mt-1">{formatCurrency(data.loading_revenue)}</p>
                </div>
                <Truck className="h-8 w-8 text-blue-500" />
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow p-4 border-l-4 border-amber-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Transport</p>
                  <p className="text-2xl font-bold">{data.transport_count}</p>
                  <p className="text-xs text-gray-500">{formatTons(data.transport_total)} tons</p>
                  <p className="text-xs text-amber-600 mt-1">{formatCurrency(data.transport_revenue)}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-amber-500" />
              </div>
            </div>
            
            <div className="bg-primary text-white rounded-lg shadow p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-80">Total Revenue</p>
                  <p className="text-2xl font-bold">{formatCurrency(data.total_revenue)}</p>
                  <p className="text-xs opacity-80 mt-1">
                    {data.harvest_count} harvests + {data.loading_count} loads + {data.transport_count} trips
                  </p>
                </div>
                <DollarSign className="h-8 w-8 opacity-80" />
              </div>
            </div>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center gap-2 mb-4">
                <PieChart className="h-5 w-5 text-gray-500" />
                <h3 className="text-lg font-semibold text-gray-900">Revenue Breakdown</h3>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <RePieChart>
                    <Pie
                      data={revenueChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {revenueChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                  </RePieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="h-5 w-5 text-gray-500" />
                <h3 className="text-lg font-semibold text-gray-900">Tonnage Breakdown</h3>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={tonnageChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis tickFormatter={(value) => formatTons(value)} />
                    <Tooltip formatter={(value) => formatTons(value)} />
                    <Bar dataKey="tons" fill="#4caf7d" radius={[4, 4, 0, 0]}>
                      {tonnageChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Additional Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center gap-2 text-gray-500 mb-2">
                <Package className="h-4 w-4" />
                <span className="text-sm">Total Tonnage</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{formatTons(data.harvest_total + data.loading_total + data.transport_total)}</p>
              <div className="mt-2 text-xs text-gray-500 flex flex-wrap gap-2">
                <span>Harvest: {formatTons(data.harvest_total)}</span>
                <span>|</span>
                <span>Load: {formatTons(data.loading_total)}</span>
                <span>|</span>
                <span>Transport: {formatTons(data.transport_total)}</span>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center gap-2 text-gray-500 mb-2">
                <Users className="h-4 w-4" />
                <span className="text-sm">Active Workers</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {new Set(data.harvests?.map(h => h.headman_id).filter(id => id)).size + 
                 new Set(data.loadings?.map(l => l.supervisor_id).filter(id => id)).size + 
                 new Set(data.transports?.map(t => t.driver_id).filter(id => id)).size}
              </p>
              <div className="mt-2 text-xs text-gray-500 flex flex-wrap gap-2">
                <span>Headmen: {new Set(data.harvests?.map(h => h.headman_id).filter(id => id)).size}</span>
                <span>|</span>
                <span>Supervisors: {new Set(data.loadings?.map(l => l.supervisor_id).filter(id => id)).size}</span>
                <span>|</span>
                <span>Drivers: {new Set(data.transports?.map(t => t.driver_id).filter(id => id)).size}</span>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center gap-2 text-gray-500 mb-2">
                <TrendingUp className="h-4 w-4" />
                <span className="text-sm">Avg Revenue per Trip</span>
              </div>
              <p className="text-2xl font-bold text-primary">
                {formatCurrency(data.transport_count > 0 ? data.transport_revenue / data.transport_count : 0)}
              </p>
              <div className="mt-2 text-xs text-gray-500">
                {data.transport_count} transport trips
              </div>
            </div>
          </div>

          {/* Harvest Records Table */}
          {data.harvests && data.harvests.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Scale className="h-5 w-5 text-green-600" />
                Harvest Records ({data.harvests.length})
              </h3>
              <DataTable
                columns={harvestColumns}
                data={data.harvests}
                loading={false}
                emptyMessage="No harvest records"
              />
            </div>
          )}

          {/* Loading Records Table */}
          {data.loadings && data.loadings.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Truck className="h-5 w-5 text-blue-600" />
                Loading Records ({data.loadings.length})
              </h3>
              <DataTable
                columns={loadingColumns}
                data={data.loadings}
                loading={false}
                emptyMessage="No loading records"
              />
            </div>
          )}

          {/* Transport Records Table */}
          {data.transports && data.transports.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-amber-600" />
                Transport Trips ({data.transports.length})
              </h3>
              <DataTable
                columns={transportColumns}
                data={data.transports}
                loading={false}
                emptyMessage="No transport trips"
              />
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default DailyReturnsComplete;
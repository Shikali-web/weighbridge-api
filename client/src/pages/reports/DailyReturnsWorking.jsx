import React, { useState, useEffect } from 'react';
import { Calendar, TrendingUp, Truck, Scale, DollarSign } from 'lucide-react';
import DataTable from '../../components/shared/DataTable';
import EmptyState from '../../components/shared/EmptyState';
import { formatCurrency, formatTons } from '../../utils/formatters';

const DailyReturnsWorking = () => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`http://localhost:5000/api/reports/daily-returns-simple?date=${selectedDate}`);
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

  useEffect(() => {
    fetchData();
  }, [selectedDate]);

  const handleDateChange = (e) => {
    setSelectedDate(e.target.value);
  };

  const harvestColumns = [
    { key: "id", label: "ID" },
    { key: "headman_name", label: "Headman", render: (v) => v || '-' },
    { key: "field_code", label: "Field", render: (v) => v || '-' },
    { key: "turnup", label: "Turnup", render: (v) => v || 0 },
    { key: "expected_tonnage", label: "Expected (T)", render: (v) => formatTons(v || 0) },
    { key: "status", label: "Status", render: (v) => v?.toUpperCase() || 'PENDING' }
  ];

  const loadingColumns = [
    { key: "id", label: "ID" },
    { key: "outgrower_name", label: "Outgrower", render: (v) => v || '-' },
    { key: "field_code", label: "Field", render: (v) => v || '-' },
    { key: "weighbridge_name", label: "Weighbridge", render: (v) => v || '-' },
    { key: "supervisor_name", label: "Supervisor", render: (v) => v || '-' },
    { key: "tons_loaded", label: "Tons", render: (v) => formatTons(v || 0) },
    { key: "trip_count", label: "Trips", render: (v) => v || 0 }
  ];

  const transportColumns = [
    { key: "id", label: "ID" },
    { key: "plate_no", label: "Truck", render: (v) => v || '-' },
    { key: "driver_name", label: "Driver", render: (v) => v || '-' },
    { key: "outgrower_name", label: "Outgrower", render: (v) => v || '-' },
    { key: "band_code", label: "Band", render: (v) => v || '-' },
    { key: "tons_transported", label: "Tons", render: (v) => formatTons(v || 0) },
    { key: "total_revenue", label: "Revenue", render: (v) => formatCurrency(v || 0) }
  ];

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
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-gray-500" />
            <input
              type="date"
              value={selectedDate}
              onChange={handleDateChange}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-600">Error: {error}</p>
          <button onClick={fetchData} className="mt-4 px-4 py-2 bg-primary text-white rounded-lg">Try Again</button>
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
          <p className="text-sm text-gray-500 mt-1">
            {new Date(selectedDate).toLocaleDateString('en-KE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-gray-500" />
          <input
            type="date"
            value={selectedDate}
            onChange={handleDateChange}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      {!hasData ? (
        <EmptyState 
          title="No Data Available"
          subtitle={`No records found for ${new Date(selectedDate).toLocaleDateString()}. Try selecting a different date.`}
        />
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
          </div>

          {/* Total Revenue Card */}
          <div className="bg-primary text-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-80">Total Daily Revenue</p>
                <p className="text-3xl font-bold">{formatCurrency(data.total_revenue)}</p>
                <p className="text-xs opacity-80 mt-1">
                  {data.harvest_count} harvests + {data.loading_count} loads + {data.transport_count} trips
                </p>
              </div>
              <DollarSign className="h-12 w-12 opacity-80" />
            </div>
          </div>

          {/* Harvest Records Table */}
          {data.harvests.length > 0 && (
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
          {data.loadings.length > 0 && (
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
          {data.transports.length > 0 && (
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

export default DailyReturnsWorking;
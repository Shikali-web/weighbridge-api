import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Truck, DollarSign, User, FileText, MapPin, Loader2 } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { formatCurrency, formatTons } from '../../utils/formatters';
import DataTable from '../../components/shared/DataTable';
import { getTransportTrips } from '../../api/transport';

const DriverPayrollDetails = () => {
  const { driverId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const week = queryParams.get('week');
  const year = queryParams.get('year');
  const driverName = queryParams.get('name') || 'Driver';

  const [transportData, setTransportData] = useState([]);
  const [summary, setSummary] = useState({
    total_trips: 0,
    total_tons: 0,
    total_payment: 0
  });

  const { data: trips, isLoading } = useQuery({
    queryKey: ['driver-trips', driverId, week, year],
    queryFn: () => getTransportTrips({ driver_id: driverId, week, year }),
    enabled: !!driverId && !!week && !!year,
  });

  useEffect(() => {
    if (trips?.data) {
      const records = trips.data;
      const tripsCount = records.length;
      const tons = records.reduce((sum, t) => sum + (t.tons_transported || 0), 0);
      const payment = records.reduce((sum, t) => sum + (t.driver_payment || 0), 0);
      
      setTransportData(records);
      setSummary({
        total_trips: tripsCount,
        total_tons: tons,
        total_payment: payment
      });
    }
  }, [trips]);

  const columns = [
    { key: "trip_date", label: "Date", render: (v) => v ? new Date(v).toLocaleDateString() : 'N/A' },
    { key: "plate_no", label: "Truck" },
    { key: "outgrower_name", label: "Outgrower" },
    { key: "band_code", label: "Band" },
    { key: "tons_transported", label: "Tons", render: (v) => formatTons(v || 0) },
    { key: "total_revenue", label: "Revenue", render: (v) => formatCurrency(v || 0) },
    { key: "driver_payment", label: "Driver Pay", render: (v) => formatCurrency(v || 0) }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate(-1)} className="p-2">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{driverName} - Payroll Details</h2>
          <p className="text-sm text-gray-500 mt-1">Week {week}, {year}</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2 text-gray-500">Loading details...</span>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center gap-2 text-gray-500 mb-2">
                <Truck className="h-4 w-4" />
                <span className="text-sm">Total Trips</span>
              </div>
              <p className="text-2xl font-bold">{summary.total_trips}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center gap-2 text-gray-500 mb-2">
                <Truck className="h-4 w-4" />
                <span className="text-sm">Total Tons</span>
              </div>
              <p className="text-2xl font-bold text-green-600">{formatTons(summary.total_tons)}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center gap-2 text-gray-500 mb-2">
                <DollarSign className="h-4 w-4" />
                <span className="text-sm">Total Payment</span>
              </div>
              <p className="text-2xl font-bold text-primary">{formatCurrency(summary.total_payment)}</p>
            </div>
          </div>

          {/* Transport Trips Section */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              Transport Trips
            </h3>
            <DataTable
              columns={columns}
              data={transportData}
              loading={isLoading}
              emptyMessage="No transport trips for this week"
            />
          </div>
        </>
      )}
    </div>
  );
};

export default DriverPayrollDetails;
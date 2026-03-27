import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Truck, DollarSign, User, FileText, Loader2 } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { formatCurrency, formatTons } from '../../utils/formatters';
import DataTable from '../../components/shared/DataTable';
import { getLoadingRecords } from '../../api/loading';

const SupervisorPayrollDetails = () => {
  const { supervisorId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const week = queryParams.get('week');
  const year = queryParams.get('year');
  const supervisorName = queryParams.get('name') || 'Supervisor';

  const [loadingData, setLoadingData] = useState([]);
  const [summary, setSummary] = useState({
    total_trips: 0,
    total_tons: 0,
    total_payment: 0
  });

  const { data: loadings, isLoading } = useQuery({
    queryKey: ['supervisor-loadings', supervisorId, week, year],
    queryFn: () => getLoadingRecords({ supervisor_id: supervisorId, week, year }),
    enabled: !!supervisorId && !!week && !!year,
  });

  useEffect(() => {
    if (loadings?.data) {
      const records = loadings.data;
      const trips = records.length;
      const tons = records.reduce((sum, l) => sum + (l.tons_loaded || 0), 0);
      const payment = trips * 100;
      
      setLoadingData(records);
      setSummary({
        total_trips: trips,
        total_tons: tons,
        total_payment: payment
      });
    }
  }, [loadings]);

  const columns = [
    { key: "load_date", label: "Date", render: (v) => v ? new Date(v).toLocaleDateString() : 'N/A' },
    { key: "field_code", label: "Field Code" },
    { key: "outgrower_name", label: "Outgrower" },
    { key: "tons_loaded", label: "Tons Loaded", render: (v) => formatTons(v || 0) },
    { key: "trip_count", label: "Trips" },
    { 
      key: "payment", 
      label: "Payment", 
      render: (_, row) => formatCurrency((row.trip_count || 0) * 100)
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate(-1)} className="p-2">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{supervisorName} - Payroll Details</h2>
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

          {/* Loading Records Section */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Truck className="h-5 w-5 text-primary" />
              Loading Records Supervised
            </h3>
            <DataTable
              columns={columns}
              data={loadingData}
              loading={isLoading}
              emptyMessage="No loading records for this week"
            />
          </div>
        </>
      )}
    </div>
  );
};

export default SupervisorPayrollDetails;
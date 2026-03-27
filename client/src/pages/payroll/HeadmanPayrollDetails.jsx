import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Calendar, Truck, Scale, DollarSign, User, FileText, Loader2 } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { formatCurrency, formatTons } from '../../utils/formatters';
import DataTable from '../../components/shared/DataTable';
import { getHarvestAssignments } from '../../api/harvest';
import { getLoadingRecords } from '../../api/loading';

const HeadmanPayrollDetails = () => {
  const { headmanId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const week = queryParams.get('week');
  const year = queryParams.get('year');
  const headmanName = queryParams.get('name') || 'Headman';

  const [harvestData, setHarvestData] = useState([]);
  const [loadingData, setLoadingData] = useState([]);
  const [summary, setSummary] = useState({
    expected_tons: 0,
    actual_tons: 0,
    tonnage_diff: 0,
    harvest_payment: 0,
    loading_payment: 0,
    total_payment: 0,
    performance: 0
  });

  const { data: harvests, isLoading: harvestsLoading } = useQuery({
    queryKey: ['headman-harvests', headmanId, week, year],
    queryFn: () => getHarvestAssignments({ headman_id: headmanId, week, year }),
    enabled: !!headmanId && !!week && !!year,
  });

  const { data: loadings, isLoading: loadingsLoading } = useQuery({
    queryKey: ['headman-loadings', headmanId, week, year],
    queryFn: () => getLoadingRecords({ headman_id: headmanId, week, year }),
    enabled: !!headmanId && !!week && !!year,
  });

  useEffect(() => {
    if (harvests?.data) {
      const harvestAssignments = harvests.data;
      const expected = harvestAssignments.reduce((sum, h) => sum + (h.expected_tonnage || 0), 0);
      const actual = harvestAssignments.reduce((sum, h) => sum + (h.actual_tonnage || 0), 0);
      const harvestPay = harvestAssignments.reduce((sum, h) => sum + (((h.actual_tonnage || 0) * 300 - (h.turnup || 0) * 500) * 0.4 || 0), 0);
      
      setHarvestData(harvestAssignments);
      setSummary(prev => ({
        ...prev,
        expected_tons: expected,
        actual_tons: actual,
        tonnage_diff: actual - expected,
        harvest_payment: harvestPay,
        performance: expected > 0 ? (actual / expected) * 100 : 0
      }));
    }
  }, [harvests]);

  useEffect(() => {
    if (loadings?.data) {
      const loadingRecords = loadings.data;
      const loadingPay = loadingRecords.reduce((sum, l) => sum + (((l.tons_loaded || 0) * 30 - (l.trip_count || 0) * 100) * 0.4 || 0), 0);
      
      setLoadingData(loadingRecords);
      setSummary(prev => ({
        ...prev,
        loading_payment: loadingPay,
        total_payment: prev.harvest_payment + loadingPay
      }));
    }
  }, [loadings]);

  const harvestColumns = [
    { key: "assignment_date", label: "Date", render: (v) => v ? new Date(v).toLocaleDateString() : 'N/A' },
    { key: "field_code", label: "Field Code" },
    { key: "expected_tonnage", label: "Expected Tons", render: (v) => formatTons(v || 0) },
    { key: "actual_tonnage", label: "Actual Tons", render: (v) => formatTons(v || 0) },
    { 
      key: "tonnage_diff", 
      label: "Diff", 
      render: (_, row) => {
        const diff = (row.actual_tonnage || 0) - (row.expected_tonnage || 0);
        if (diff > 0) return <span className="text-green-600">↑ {formatTons(diff)}</span>;
        if (diff < 0) return <span className="text-red-600">↓ {formatTons(Math.abs(diff))}</span>;
        return formatTons(0);
      }
    },
    { 
      key: "payment", 
      label: "Payment", 
      render: (_, row) => formatCurrency(((row.actual_tonnage || 0) * 300 - (row.turnup || 0) * 500) * 0.4 || 0)
    }
  ];

  const loadingColumns = [
    { key: "load_date", label: "Date", render: (v) => v ? new Date(v).toLocaleDateString() : 'N/A' },
    { key: "field_code", label: "Field Code" },
    { key: "tons_loaded", label: "Tons Loaded", render: (v) => formatTons(v || 0) },
    { key: "trip_count", label: "Trips" },
    { 
      key: "payment", 
      label: "Payment", 
      render: (_, row) => formatCurrency(((row.tons_loaded || 0) * 30 - (row.trip_count || 0) * 100) * 0.4 || 0)
    }
  ];

  const isLoading = harvestsLoading || loadingsLoading;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate(-1)} className="p-2">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{headmanName} - Payroll Details</h2>
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center gap-2 text-gray-500 mb-2">
                <Scale className="h-4 w-4" />
                <span className="text-sm">Expected Tons</span>
              </div>
              <p className="text-2xl font-bold">{formatTons(summary.expected_tons)}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center gap-2 text-gray-500 mb-2">
                <Truck className="h-4 w-4" />
                <span className="text-sm">Actual Tons</span>
              </div>
              <p className="text-2xl font-bold text-green-600">{formatTons(summary.actual_tons)}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center gap-2 text-gray-500 mb-2">
                <DollarSign className="h-4 w-4" />
                <span className="text-sm">Total Payment</span>
              </div>
              <p className="text-2xl font-bold text-primary">{formatCurrency(summary.total_payment)}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center gap-2 text-gray-500 mb-2">
                <User className="h-4 w-4" />
                <span className="text-sm">Performance</span>
              </div>
              <p className={`text-2xl font-bold ${summary.performance >= 100 ? 'text-green-600' : summary.performance >= 85 ? 'text-amber-600' : 'text-red-600'}`}>
                {summary.performance.toFixed(1)}%
              </p>
            </div>
          </div>

          {/* Harvest Assignments Section */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Scale className="h-5 w-5 text-primary" />
              Harvest Assignments
            </h3>
            <DataTable
              columns={harvestColumns}
              data={harvestData}
              loading={harvestsLoading}
              emptyMessage="No harvest assignments for this week"
            />
          </div>

          {/* Loading Records Section */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Truck className="h-5 w-5 text-primary" />
              Loading Records
            </h3>
            <DataTable
              columns={loadingColumns}
              data={loadingData}
              loading={loadingsLoading}
              emptyMessage="No loading records for this week"
            />
          </div>

          {/* Payment Breakdown */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Payment Breakdown
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg text-center">
                <p className="text-sm text-gray-500">Harvest Payment</p>
                <p className="text-xl font-bold text-gray-900">{formatCurrency(summary.harvest_payment)}</p>
                <p className="text-xs text-gray-500 mt-1">40% of harvest profit</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg text-center">
                <p className="text-sm text-gray-500">Loading Payment</p>
                <p className="text-xl font-bold text-gray-900">{formatCurrency(summary.loading_payment)}</p>
                <p className="text-xs text-gray-500 mt-1">40% of loading profit</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg text-center">
                <p className="text-sm text-green-600">Total Payment</p>
                <p className="text-xl font-bold text-green-600">{formatCurrency(summary.total_payment)}</p>
                <p className="text-xs text-green-500 mt-1">Net payable to headman</p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default HeadmanPayrollDetails;
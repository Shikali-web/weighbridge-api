import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Download, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import WeekPicker from '../../components/shared/WeekPicker';
import DataTable from '../../components/shared/DataTable';
import StatusBadge from '../../components/shared/StatusBadge';
import ConfirmDialog from '../../components/shared/ConfirmDialog';
import { Button } from '../../components/ui/button';
import { getHeadmanPayroll, generateHeadmanPayroll, markHeadmanPaid } from '../../api/payroll';
import { formatCurrency, formatTons, getISOWeek } from '../../utils/formatters';

const HeadmanPayroll = () => {
  const currentDate = new Date();
  const [week, setWeek] = useState(getISOWeek(currentDate));
  const [year, setYear] = useState(currentDate.getFullYear());
  const [isGenerating, setIsGenerating] = useState(false);
  const [debugInfo, setDebugInfo] = useState(null);
  const queryClient = useQueryClient();

  const { data: payroll, isLoading, error, refetch } = useQuery({
    queryKey: ['headman-payroll', week, year],
    queryFn: () => getHeadmanPayroll(week, year),
    enabled: true,
  });

  // Debug: Check what data is available
  useEffect(() => {
    const checkData = async () => {
      try {
        const response = await fetch(`http://localhost:5000/api/payroll/debug/${week}/${year}`);
        const data = await response.json();
        setDebugInfo(data.data);
        console.log('Debug data:', data.data);
      } catch (err) {
        console.error('Debug error:', err);
      }
    };
    checkData();
  }, [week, year]);

  const generateMutation = useMutation({
    mutationFn: () => generateHeadmanPayroll(week, year),
    onSuccess: () => {
      toast.success('Headman payroll generated successfully');
      queryClient.invalidateQueries(['headman-payroll']);
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to generate payroll');
    }
  });

  const markPaidMutation = useMutation({
    mutationFn: markHeadmanPaid,
    onSuccess: () => {
      toast.success('Payroll marked as paid');
      queryClient.invalidateQueries(['headman-payroll']);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to mark as paid');
    }
  });

  const handleGeneratePayroll = async () => {
    setIsGenerating(true);
    try {
      await generateMutation.mutateAsync();
    } finally {
      setIsGenerating(false);
    }
  };

  const handleWeekChange = (newWeek, newYear) => {
    setWeek(newWeek);
    setYear(newYear);
  };

  const payrollData = payroll?.data || [];
  const totalPayroll = payrollData.reduce((sum, item) => sum + (item.total_payable || 0), 0);
  const paidCount = payrollData.filter(item => item.is_paid).length;
  const unpaidCount = payrollData.length - paidCount;
  const totalOutstanding = payrollData
    .filter(item => !item.is_paid)
    .reduce((sum, item) => sum + (item.total_payable || 0), 0);

  const columns = [
    { key: "headman_name", label: "Headman Name" },
    { key: "supervisor_name", label: "Supervisor" },
    { key: "expected_tons", label: "Expected Tons", render: (value) => formatTons(value) },
    { key: "actual_tons", label: "Actual Tons", render: (value) => formatTons(value) },
    { 
      key: "tonnage_diff", 
      label: "Diff", 
      render: (value) => {
        if (value > 0) return <span className="text-green-600">↑ {formatTons(value)}</span>;
        if (value < 0) return <span className="text-red-600">↓ {formatTons(Math.abs(value))}</span>;
        return formatTons(0);
      }
    },
    { key: "harvest_payment", label: "Harvest Share", render: (value) => formatCurrency(value) },
    { key: "loading_payment", label: "Loading Share", render: (value) => formatCurrency(value) },
    { 
      key: "total_payable", 
      label: "Net Payable",
      render: (value) => <span className="font-bold">{formatCurrency(value)}</span>
    },
    { 
      key: "is_paid", 
      label: "Paid Status",
      render: (value) => <StatusBadge status={value ? 'paid' : 'unpaid'} />
    },
    {
      key: "actions",
      label: "Action",
      render: (_, row) => (
        row.is_paid ? (
          <Button variant="ghost" size="sm" disabled className="text-green-600">
            <CheckCircle className="h-4 w-4 mr-1" />
            Paid ✓
          </Button>
        ) : (
          <ConfirmDialog
            title="Mark as Paid"
            description={`Are you sure you want to mark ${row.headman_name}'s payroll as paid?`}
            onConfirm={() => markPaidMutation.mutate(row.headman_id)}
            trigger={
              <Button variant="outline" size="sm" className="text-green-600 border-green-600">
                Mark Paid
              </Button>
            }
          />
        )
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Headman Payroll</h2>
          <p className="text-sm text-gray-500 mt-1">Payments are processed on Thursdays</p>
        </div>
        <Button 
          onClick={handleGeneratePayroll}
          disabled={isGenerating}
          className="bg-primary text-white"
        >
          <Download className="h-4 w-4 mr-2" />
          {isGenerating ? 'Generating...' : 'Generate Payroll'}
        </Button>
      </div>

      <WeekPicker week={week} year={year} onChange={handleWeekChange} />

      {/* Debug Info - Remove after testing */}
      {debugInfo && (
        <div className="bg-gray-50 rounded-lg p-4 text-sm">
          <p className="font-medium mb-2">Debug Info:</p>
          <p>Assignments in week: {debugInfo.assignments_count}</p>
          <p>Loading records in week: {debugInfo.loading_count}</p>
          {debugInfo.assignments_count === 0 && debugInfo.loading_count === 0 && (
            <p className="text-amber-600 mt-2 flex items-center gap-1">
              <AlertCircle className="h-4 w-4" />
              No assignments or loading records found for this week. Add some data first.
            </p>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">Total Payroll</p>
          <p className="text-2xl font-bold text-primary">{formatCurrency(totalPayroll)}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">Paid</p>
          <p className="text-2xl font-bold text-green-600">{paidCount}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">Unpaid</p>
          <p className="text-2xl font-bold text-red-600">{unpaidCount}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">Total Outstanding</p>
          <p className="text-2xl font-bold text-amber-600">{formatCurrency(totalOutstanding)}</p>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={payrollData}
        loading={isLoading}
        emptyMessage="No payroll data found for this week. Click 'Generate Payroll' to create."
      />
    </div>
  );
};

export default HeadmanPayroll;
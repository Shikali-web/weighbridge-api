import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Download, CheckCircle, Eye } from 'lucide-react';
import { toast } from 'sonner';
import WeekPicker from '../../components/shared/WeekPicker';
import DataTable from '../../components/shared/DataTable';
import StatusBadge from '../../components/shared/StatusBadge';
import ConfirmDialog from '../../components/shared/ConfirmDialog';
import { Button } from '../../components/ui/button';
import { getHeadmanPayroll, generateHeadmanPayroll, markHeadmanPaid } from '../../api/payroll';
import { formatCurrency, formatTons, getISOWeek } from '../../utils/formatters';

const HeadmanPayroll = () => {
  const navigate = useNavigate();
  const currentDate = new Date();
  const [week, setWeek] = useState(getISOWeek(currentDate));
  const [year, setYear] = useState(currentDate.getFullYear());
  const [isGenerating, setIsGenerating] = useState(false);
  const queryClient = useQueryClient();

  const { data: payroll, isLoading, refetch } = useQuery({
    queryKey: ['headman-payroll', week, year],
    queryFn: () => getHeadmanPayroll(week, year),
    enabled: true,
  });

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

  const handleViewDetails = (headmanId, headmanName) => {
    navigate(`/payroll/headman-details/${headmanId}?week=${week}&year=${year}&name=${encodeURIComponent(headmanName)}`);
  };

  const payrollData = payroll?.data || [];
  
  // Calculate totals - parse values properly
  const totalPayroll = payrollData.reduce((sum, item) => sum + (parseFloat(item.total_payable) || 0), 0);
  const paidCount = payrollData.filter(item => item.is_paid === true).length;
  const unpaidCount = payrollData.filter(item => item.is_paid !== true).length;
  const totalOutstanding = payrollData
    .filter(item => item.is_paid !== true)
    .reduce((sum, item) => sum + (parseFloat(item.total_payable) || 0), 0);

  const columns = [
    { key: "headman_name", label: "Headman Name", render: (v) => v || 'N/A' },
    { key: "supervisor_name", label: "Supervisor", render: (v) => v || 'N/A' },
    { key: "expected_tons", label: "Expected Tons", render: (v) => formatTons(parseFloat(v) || 0) },
    { key: "actual_tons", label: "Actual Tons", render: (v) => formatTons(parseFloat(v) || 0) },
    { 
      key: "tonnage_diff", 
      label: "Diff", 
      render: (v) => {
        const diff = parseFloat(v) || 0;
        if (diff > 0) return <span className="text-green-600">↑ {formatTons(diff)}</span>;
        if (diff < 0) return <span className="text-red-600">↓ {formatTons(Math.abs(diff))}</span>;
        return formatTons(0);
      }
    },
    { key: "harvest_payment", label: "Harvest Share", render: (v) => formatCurrency(parseFloat(v) || 0) },
    { key: "loading_payment", label: "Loading Share", render: (v) => formatCurrency(parseFloat(v) || 0) },
    { 
      key: "total_payable", 
      label: "Net Payable",
      render: (v) => <span className="font-bold">{formatCurrency(parseFloat(v) || 0)}</span>
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
        <div className="flex gap-2">
          {!row.is_paid ? (
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
          ) : (
            <Button variant="ghost" size="sm" disabled className="text-green-600">
              <CheckCircle className="h-4 w-4 mr-1" />
              Paid ✓
            </Button>
          )}
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => handleViewDetails(row.headman_id, row.headman_name)}
            className="text-blue-600"
          >
            <Eye className="h-4 w-4 mr-1" />
            Details
          </Button>
        </div>
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
        emptyMessage="No headman payroll data found for this week. Click 'Generate Payroll' to create."
      />
    </div>
  );
};

export default HeadmanPayroll;
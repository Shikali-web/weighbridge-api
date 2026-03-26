import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Download, CheckCircle } from 'lucide-react';
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
  const queryClient = useQueryClient();

  const { data: payroll, isLoading } = useQuery({
    queryKey: ['headman-payroll', week, year],
    queryFn: () => getHeadmanPayroll(week, year)
  });

  const generateMutation = useMutation({
    mutationFn: () => generateHeadmanPayroll(week, year),
    onSuccess: () => {
      toast.success('Payroll generated successfully');
      queryClient.invalidateQueries(['headman-payroll']);
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

  const handleWeekChange = (newWeek, newYear) => {
    setWeek(newWeek);
    setYear(newYear);
  };

  const payrollData = payroll?.data || [];
  const totalPayroll = payrollData.reduce((sum, item) => sum + (item.net_payable || 0), 0);
  const paidCount = payrollData.filter(item => item.payment_status === 'paid').length;
  const unpaidCount = payrollData.length - paidCount;
  const totalOutstanding = payrollData
    .filter(item => item.payment_status !== 'paid')
    .reduce((sum, item) => sum + (item.net_payable || 0), 0);

  const columns = [
    { key: "headman_name", label: "Headman Name" },
    { key: "supervisor_name", label: "Supervisor" },
    { key: "expected_tons", label: "Expected Tons", render: (value) => formatTons(value) },
    { key: "actual_tons", label: "Actual Tons", render: (value) => formatTons(value) },
    { key: "diff", label: "Diff", render: (value) => formatTons(value) },
    { key: "harvest_profit_share", label: "Harvest Profit Share", render: (value) => formatCurrency(value) },
    { key: "harvest_commission", label: "Harvest Commission", render: (value) => formatCurrency(value) },
    { key: "loading_profit_share", label: "Loading Profit Share", render: (value) => formatCurrency(value) },
    { key: "penalty", label: "Penalty", render: (value) => formatCurrency(value) },
    { 
      key: "net_payable", 
      label: "Net Payable",
      render: (value) => <span className="font-bold">{formatCurrency(value)}</span>
    },
    { 
      key: "payment_status", 
      label: "Paid Status",
      render: (value) => <StatusBadge status={value} />
    },
    {
      key: "actions",
      label: "Action",
      render: (_, row) => (
        row.payment_status === 'paid' ? (
          <Button variant="ghost" size="sm" disabled className="text-green-600">
            <CheckCircle className="h-4 w-4 mr-1" />
            Paid ✓
          </Button>
        ) : (
          <ConfirmDialog
            title="Mark as Paid"
            description={`Are you sure you want to mark ${row.headman_name}'s payroll as paid?`}
            onConfirm={() => markPaidMutation.mutate(row.id)}
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
        <h2 className="text-2xl font-bold text-gray-900">Headman Payroll</h2>
        <Button 
          onClick={() => generateMutation.mutate()}
          disabled={generateMutation.isLoading}
          className="bg-primary text-white"
        >
          <Download className="h-4 w-4 mr-2" />
          Generate Payroll
        </Button>
      </div>

      {/* Week Picker */}
      <WeekPicker week={week} year={year} onChange={handleWeekChange} />

      {/* Summary Bar */}
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

      {/* Payroll Table */}
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
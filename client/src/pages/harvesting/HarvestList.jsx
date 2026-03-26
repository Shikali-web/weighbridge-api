import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Edit, Trash2, Eye } from 'lucide-react';
import { toast } from 'sonner';
import DataTable from '../../components/shared/DataTable';
import StatusBadge from '../../components/shared/StatusBadge';
import ConfirmDialog from '../../components/shared/ConfirmDialog';
import { Button } from '../../components/ui/button';
import HarvestForm from './HarvestForm';
import { getHarvestAssignments, deleteHarvestAssignment } from '../../api/harvest';
import { formatCurrency, formatTons } from '../../utils/formatters';

const HarvestList = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState(null);
  const queryClient = useQueryClient();

  const { data: assignments, isLoading } = useQuery({
    queryKey: ['harvest-assignments', searchTerm, statusFilter],
    queryFn: () => getHarvestAssignments({ search: searchTerm, status: statusFilter })
  });

  const deleteMutation = useMutation({
    mutationFn: deleteHarvestAssignment,
    onSuccess: () => {
      toast.success('Harvest assignment deleted successfully');
      queryClient.invalidateQueries(['harvest-assignments']);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to delete harvest assignment');
    }
  });

  const handleEdit = (assignment) => {
    setEditingAssignment(assignment);
    setIsFormOpen(true);
  };

  const columns = [
    { key: "id", label: "Assignment ID" },
    { key: "assignment_date", label: "Date" },
    { key: "headman_name", label: "Headman" },
    { key: "field_code", label: "Field Code" },
    { key: "turnup", label: "Turnup" },
    { key: "expected_tonnage", label: "Expected Tons", render: (value) => formatTons(value) },
    { key: "actual_tonnage", label: "Actual Tons", render: (value) => value ? formatTons(value) : '-' },
    { 
      key: "tonnage_diff", 
      label: "Tonnage Diff",
      render: (value, row) => {
        if (row.actual_tonnage) {
          const diff = row.actual_tonnage - row.expected_tonnage;
          if (diff > 0) return <span className="text-green-600">↑ {formatTons(diff)}</span>;
          if (diff < 0) return <span className="text-red-600">↓ {formatTons(Math.abs(diff))}</span>;
          return formatTons(0);
        }
        return '-';
      }
    },
    { 
      key: "status", 
      label: "Status",
      render: (value) => <StatusBadge status={value} />
    },
    {
      key: "actions",
      label: "Actions",
      render: (_, row) => (
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => console.log('View', row.id)}>
            <Eye className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => handleEdit(row)}>
            <Edit className="h-4 w-4" />
          </Button>
          <ConfirmDialog
            title="Delete Assignment"
            description="Are you sure you want to delete this harvest assignment? This action cannot be undone."
            onConfirm={() => deleteMutation.mutate(row.id)}
            trigger={
              <Button variant="ghost" size="sm">
                <Trash2 className="h-4 w-4 text-red-600" />
              </Button>
            }
          />
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Harvest Assignments</h2>
        <Button onClick={() => { setEditingAssignment(null); setIsFormOpen(true); }} className="bg-primary text-white">
          <Plus className="h-4 w-4 mr-2" />
          New Assignment
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by field code or headman..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={assignments?.data || []}
        loading={isLoading}
        emptyMessage="No harvest assignments found"
      />

      {/* Harvest Form Modal */}
      <HarvestForm 
        isOpen={isFormOpen} 
        onClose={() => { setIsFormOpen(false); setEditingAssignment(null); }}
        assignment={editingAssignment}
      />
    </div>
  );
};

export default HarvestList;
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Edit, Trash2, Eye } from 'lucide-react';
import { toast } from 'sonner';
import DataTable from '../../components/shared/DataTable';
import StatusBadge from '../../components/shared/StatusBadge';
import { Button } from '../../components/ui/button';
import LoadingForm from './LoadingForm';
import { getLoadingRecords, deleteLoadingRecord } from '../../api/loading';
import { formatTons } from '../../utils/formatters';

const LoadingList = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const queryClient = useQueryClient();

  const { data: records, isLoading } = useQuery({
    queryKey: ['loading-records', searchTerm, statusFilter],
    queryFn: () => getLoadingRecords({ search: searchTerm, status: statusFilter })
  });

  const deleteMutation = useMutation({
    mutationFn: deleteLoadingRecord,
    onSuccess: () => {
      toast.success('Loading record deleted successfully');
      queryClient.invalidateQueries(['loading-records']);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to delete loading record');
    }
  });

  const handleEdit = (record) => {
    setEditingRecord(record);
    setIsFormOpen(true);
  };

  const columns = [
    { key: "id", label: "Record ID" },
    { key: "load_date", label: "Date" },
    { key: "outgrower_name", label: "Outgrower" },
    { key: "headman_name", label: "Headman" },
    { key: "weighbridge_name", label: "Weighbridge" },
    { key: "supervisor_name", label: "Supervisor" },
    { key: "tons_loaded", label: "Tons Loaded", render: (value) => formatTons(value) },
    { key: "trip_count", label: "Trip Count" },
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
          <Button variant="ghost" size="sm" onClick={() => deleteMutation.mutate(row.id)}>
            <Trash2 className="h-4 w-4 text-red-600" />
          </Button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Loading Records</h2>
        <Button onClick={() => { setEditingRecord(null); setIsFormOpen(true); }} className="bg-primary text-white">
          <Plus className="h-4 w-4 mr-2" />
          New Loading Record
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search records..."
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
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={records?.data || []}
        loading={isLoading}
        emptyMessage="No loading records found"
      />

      {/* Loading Form Modal */}
      <LoadingForm 
        isOpen={isFormOpen} 
        onClose={() => { setIsFormOpen(false); setEditingRecord(null); }}
        record={editingRecord}
      />
    </div>
  );
};

export default LoadingList;
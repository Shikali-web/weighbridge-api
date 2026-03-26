import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Edit, Trash2, Eye } from 'lucide-react';
import { toast } from 'sonner';
import DataTable from '../../components/shared/DataTable';
import { Button } from '../../components/ui/button';
import TransportForm from './TransportForm';
import { getTransportTrips, deleteTransportTrip } from '../../api/transport';
import { formatCurrency, formatTons } from '../../utils/formatters';

const TransportList = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTrip, setEditingTrip] = useState(null);
  const queryClient = useQueryClient();

  const { data: trips, isLoading } = useQuery({
    queryKey: ['transport-trips', searchTerm],
    queryFn: () => getTransportTrips({ search: searchTerm })
  });

  const deleteMutation = useMutation({
    mutationFn: deleteTransportTrip,
    onSuccess: () => {
      toast.success('Transport trip deleted successfully');
      queryClient.invalidateQueries(['transport-trips']);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to delete transport trip');
    }
  });

  const handleEdit = (trip) => {
    setEditingTrip(trip);
    setIsFormOpen(true);
  };

  const columns = [
    { key: "id", label: "Trip ID" },
    { key: "trip_date", label: "Date" },
    { key: "plate_no", label: "Truck/Plate" },
    { key: "driver_name", label: "Driver" },
    { key: "outgrower_name", label: "Outgrower" },
    { key: "weighbridge_name", label: "Weighbridge" },
    { key: "band_code", label: "Band" },
    { key: "tons_transported", label: "Tons", render: (value) => formatTons(value) },
    { key: "transport_rate", label: "Rate (KES/ton)", render: (value) => formatCurrency(value) },
    { key: "total_revenue", label: "Total Revenue", render: (value) => formatCurrency(value) },
    { key: "driver_payment", label: "Driver Pay", render: (value) => formatCurrency(value) },
    { key: "sagib_retention", label: "Sagib Retention", render: (value) => formatCurrency(value) },
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
        <h2 className="text-2xl font-bold text-gray-900">Transport Trips</h2>
        <Button onClick={() => { setEditingTrip(null); setIsFormOpen(true); }} className="bg-primary text-white">
          <Plus className="h-4 w-4 mr-2" />
          New Trip
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search trips by truck, driver or outgrower..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={trips?.data || []}
        loading={isLoading}
        emptyMessage="No transport trips found"
      />

      {/* Transport Form Modal */}
      <TransportForm 
        isOpen={isFormOpen} 
        onClose={() => { setIsFormOpen(false); setEditingTrip(null); }}
        trip={editingTrip}
      />
    </div>
  );
};

export default TransportList;
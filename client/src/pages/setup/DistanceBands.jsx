import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit, Trash2, Search } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import DataTable from '../../components/shared/DataTable';
import ConfirmDialog from '../../components/shared/ConfirmDialog';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import { getDistanceBands, createDistanceBand, updateDistanceBand, deleteDistanceBand } from '../../api/setup';
import { formatCurrency } from '../../utils/formatters';

const distanceBandSchema = z.object({
  band_code: z.string().min(1, 'Band code is required'),
  min_km: z.number().min(0, 'Min km must be 0 or greater'),
  max_km: z.number().min(0, 'Max km must be greater than min km'),
  transport_rate_per_ton: z.number().min(0, 'Transport rate must be 0 or greater'),
}).refine((data) => data.max_km > data.min_km, {
  message: "Max km must be greater than min km",
  path: ["max_km"],
});

const DistanceBands = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBand, setEditingBand] = useState(null);
  const queryClient = useQueryClient();

  const { data: bands, isLoading } = useQuery({
    queryKey: ['distance-bands', searchTerm],
    queryFn: () => getDistanceBands(searchTerm)
  });

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm({
    resolver: zodResolver(distanceBandSchema),
    defaultValues: {
      band_code: '',
      min_km: '',
      max_km: '',
      transport_rate_per_ton: '',
    }
  });

  const watchTransportRate = watch('transport_rate_per_ton');

  // Calculate derived values (40% for driver, 60% for Sagib)
  const driverRate = watchTransportRate ? parseFloat(watchTransportRate) * 0.4 : 0;
  const sagibRate = watchTransportRate ? parseFloat(watchTransportRate) * 0.6 : 0;

  const createMutation = useMutation({
    mutationFn: createDistanceBand,
    onSuccess: () => {
      toast.success('Distance band created successfully');
      queryClient.invalidateQueries(['distance-bands']);
      setIsModalOpen(false);
      reset();
    },
    onError: (error) => {
      console.error('Create error:', error);
      toast.error(error.message || 'Failed to create distance band');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => updateDistanceBand(id, data),
    onSuccess: () => {
      toast.success('Distance band updated successfully');
      queryClient.invalidateQueries(['distance-bands']);
      setIsModalOpen(false);
      setEditingBand(null);
      reset();
    },
    onError: (error) => {
      console.error('Update error:', error);
      toast.error(error.message || 'Failed to update distance band');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: deleteDistanceBand,
    onSuccess: () => {
      toast.success('Distance band deleted successfully');
      queryClient.invalidateQueries(['distance-bands']);
    },
    onError: (error) => {
      console.error('Delete error:', error);
      toast.error(error.message || 'Failed to delete distance band');
    }
  });

  const onSubmit = (data) => {
    const formattedData = {
      band_code: data.band_code,
      min_km: parseFloat(data.min_km),
      max_km: parseFloat(data.max_km),
      transport_rate_per_ton: parseFloat(data.transport_rate_per_ton),
    };
    
    if (editingBand) {
      updateMutation.mutate({ id: editingBand.id, data: formattedData });
    } else {
      createMutation.mutate(formattedData);
    }
  };

  const handleEdit = (band) => {
    setEditingBand(band);
    setValue('band_code', band.band_code);
    setValue('min_km', band.min_km);
    setValue('max_km', band.max_km);
    setValue('transport_rate_per_ton', band.transport_rate_per_ton);
    setIsModalOpen(true);
  };

  const handleAddNew = () => {
    setEditingBand(null);
    reset();
    setIsModalOpen(true);
  };

  const columns = [
    { key: "band_code", label: "Band Code" },
    { key: "min_km", label: "Min (km)" },
    { key: "max_km", label: "Max (km)" },
    { key: "transport_rate_per_ton", label: "Transport Rate (KES/ton)", render: (v) => formatCurrency(v) },
    { key: "driver_rate_per_ton", label: "Driver Rate (KES/ton)", render: (v) => formatCurrency(v || 0) },
    { key: "sagib_rate_per_ton", label: "Sagib Retention (KES/ton)", render: (v) => formatCurrency(v || 0) },
    {
      key: "actions",
      label: "Actions",
      render: (_, row) => (
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => handleEdit(row)}>
            <Edit className="h-4 w-4" />
          </Button>
          <ConfirmDialog
            title="Delete Distance Band"
            description={`Are you sure you want to delete band ${row.band_code}? This action cannot be undone.`}
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
    <>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900">Distance Bands</h3>
          <Button onClick={handleAddNew} className="bg-primary text-white">
            <Plus className="h-4 w-4 mr-2" />
            Add Band
          </Button>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search distance bands..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        <DataTable
          columns={columns}
          data={bands?.data || []}
          loading={isLoading}
          emptyMessage="No distance bands found"
        />
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingBand ? 'Edit Distance Band' : 'Add New Distance Band'}</DialogTitle>
            <DialogDescription>
              {editingBand ? 'Update distance band information' : 'Enter the distance band details below'}
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="band_code">Band Code *</Label>
              <Input
                id="band_code"
                {...register('band_code')}
                placeholder="e.g., A, B, C"
                className="mt-1"
              />
              {errors.band_code && (
                <p className="text-red-500 text-sm mt-1">{errors.band_code.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="min_km">Min Distance (km) *</Label>
                <Input
                  id="min_km"
                  type="number"
                  step="0.1"
                  {...register('min_km', { valueAsNumber: true })}
                  placeholder="0"
                  className="mt-1"
                />
                {errors.min_km && (
                  <p className="text-red-500 text-sm mt-1">{errors.min_km.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="max_km">Max Distance (km) *</Label>
                <Input
                  id="max_km"
                  type="number"
                  step="0.1"
                  {...register('max_km', { valueAsNumber: true })}
                  placeholder="10"
                  className="mt-1"
                />
                {errors.max_km && (
                  <p className="text-red-500 text-sm mt-1">{errors.max_km.message}</p>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="transport_rate_per_ton">Transport Rate (KES/ton) *</Label>
              <Input
                id="transport_rate_per_ton"
                type="number"
                step="0.01"
                {...register('transport_rate_per_ton', { valueAsNumber: true })}
                placeholder="Enter rate per ton"
                className="mt-1"
              />
              {errors.transport_rate_per_ton && (
                <p className="text-red-500 text-sm mt-1">{errors.transport_rate_per_ton.message}</p>
              )}
            </div>

            {/* Show calculated rates */}
            {watchTransportRate > 0 && (
              <div className="bg-gray-50 p-3 rounded-lg space-y-1">
                <p className="text-sm font-medium text-gray-700">Calculated Rates:</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-gray-500">Driver Rate (40%):</span>
                    <span className="ml-2 font-medium">{formatCurrency(driverRate)}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Sagib Retention (60%):</span>
                    <span className="ml-2 font-medium">{formatCurrency(sagibRate)}</span>
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-1">These rates are automatically calculated</p>
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-primary text-white" disabled={createMutation.isLoading || updateMutation.isLoading}>
                {createMutation.isLoading || updateMutation.isLoading ? 'Saving...' : (editingBand ? 'Update' : 'Create')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default DistanceBands;
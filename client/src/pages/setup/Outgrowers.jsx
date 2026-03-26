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
import { Textarea } from '../../components/ui/textarea';
import { Label } from '../../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import { getOutgrowers, createOutgrower, updateOutgrower, deleteOutgrower } from '../../api/setup';
import { getDistanceBands, getWeighbridges } from '../../api/setup';

const outgrowerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  field_code: z.string().min(1, 'Field code is required'),
  field_size_ha: z.number().min(0.1, 'Field size must be greater than 0'),
  distance_band_id: z.string().min(1, 'Distance band is required'),
  weighbridge_id: z.string().min(1, 'Weighbridge is required'),
  location_notes: z.string().optional(),
  is_active: z.boolean().default(true),
});

const Outgrowers = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOutgrower, setEditingOutgrower] = useState(null);
  const queryClient = useQueryClient();

  const { data: outgrowers, isLoading } = useQuery({
    queryKey: ['outgrowers', searchTerm],
    queryFn: () => getOutgrowers(searchTerm)
  });

  const { data: distanceBands } = useQuery({
    queryKey: ['distance-bands'],
    queryFn: () => getDistanceBands()
  });

  const { data: weighbridges } = useQuery({
    queryKey: ['weighbridges'],
    queryFn: () => getWeighbridges()
  });

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm({
    resolver: zodResolver(outgrowerSchema),
    defaultValues: {
      name: '',
      field_code: '',
      field_size_ha: '',
      distance_band_id: '',
      weighbridge_id: '',
      location_notes: '',
      is_active: true,
    }
  });

  const createMutation = useMutation({
    mutationFn: createOutgrower,
    onSuccess: () => {
      toast.success('Outgrower created successfully');
      queryClient.invalidateQueries(['outgrowers']);
      setIsModalOpen(false);
      reset();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to create outgrower');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => updateOutgrower(id, data),
    onSuccess: () => {
      toast.success('Outgrower updated successfully');
      queryClient.invalidateQueries(['outgrowers']);
      setIsModalOpen(false);
      setEditingOutgrower(null);
      reset();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update outgrower');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: deleteOutgrower,
    onSuccess: () => {
      toast.success('Outgrower deleted successfully');
      queryClient.invalidateQueries(['outgrowers']);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to delete outgrower');
    }
  });

  const onSubmit = (data) => {
    const formattedData = {
      ...data,
      field_size_ha: parseFloat(data.field_size_ha),
      distance_band_id: parseInt(data.distance_band_id),
      weighbridge_id: parseInt(data.weighbridge_id),
    };
    
    if (editingOutgrower) {
      updateMutation.mutate({ id: editingOutgrower.id, data: formattedData });
    } else {
      createMutation.mutate(formattedData);
    }
  };

  const handleEdit = (outgrower) => {
    setEditingOutgrower(outgrower);
    setValue('name', outgrower.name);
    setValue('field_code', outgrower.field_code);
    setValue('field_size_ha', outgrower.field_size_ha);
    setValue('distance_band_id', outgrower.distance_band_id?.toString());
    setValue('weighbridge_id', outgrower.weighbridge_id?.toString());
    setValue('location_notes', outgrower.location_notes || '');
    setValue('is_active', outgrower.is_active);
    setIsModalOpen(true);
  };

  const handleAddNew = () => {
    setEditingOutgrower(null);
    reset();
    setIsModalOpen(true);
  };

  const columns = [
    { key: "name", label: "Name" },
    { key: "field_code", label: "Field Code" },
    { key: "field_size_ha", label: "Size (ha)" },
    { key: "band_code", label: "Distance Band" },
    { key: "weighbridge_name", label: "Weighbridge" },
    { 
      key: "is_active", 
      label: "Status",
      render: (value) => (
        <span className={`px-2 py-1 text-xs rounded-full ${value ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {value ? 'Active' : 'Inactive'}
        </span>
      )
    },
    {
      key: "actions",
      label: "Actions",
      render: (_, row) => (
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => handleEdit(row)}>
            <Edit className="h-4 w-4" />
          </Button>
          <ConfirmDialog
            title="Delete Outgrower"
            description={`Are you sure you want to delete ${row.name}? This action cannot be undone.`}
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
          <h3 className="text-lg font-semibold text-gray-900">Outgrowers</h3>
          <Button onClick={handleAddNew} className="bg-primary text-white">
            <Plus className="h-4 w-4 mr-2" />
            Add Outgrower
          </Button>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search outgrowers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        <DataTable
          columns={columns}
          data={outgrowers?.data || []}
          loading={isLoading}
          emptyMessage="No outgrowers found"
        />
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingOutgrower ? 'Edit Outgrower' : 'Add New Outgrower'}</DialogTitle>
            <DialogDescription>
              {editingOutgrower ? 'Update outgrower information' : 'Enter the outgrower details below'}
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                {...register('name')}
                placeholder="Enter outgrower name"
                className="mt-1"
              />
              {errors.name && (
                <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="field_code">Field Code</Label>
              <Input
                id="field_code"
                {...register('field_code')}
                placeholder="Enter field code"
                className="mt-1"
              />
              {errors.field_code && (
                <p className="text-red-500 text-sm mt-1">{errors.field_code.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="field_size_ha">Field Size (Hectares)</Label>
              <Input
                id="field_size_ha"
                type="number"
                step="0.1"
                {...register('field_size_ha', { valueAsNumber: true })}
                placeholder="Enter field size"
                className="mt-1"
              />
              {errors.field_size_ha && (
                <p className="text-red-500 text-sm mt-1">{errors.field_size_ha.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="distance_band_id">Distance Band</Label>
              <Select
                value={watch('distance_band_id')}
                onValueChange={(value) => setValue('distance_band_id', value)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select distance band" />
                </SelectTrigger>
                <SelectContent>
                  {distanceBands?.data?.map((band) => (
                    <SelectItem key={band.id} value={band.id.toString()}>
                      {band.band_code} - {band.min_km}-{band.max_km} km
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.distance_band_id && (
                <p className="text-red-500 text-sm mt-1">{errors.distance_band_id.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="weighbridge_id">Weighbridge</Label>
              <Select
                value={watch('weighbridge_id')}
                onValueChange={(value) => setValue('weighbridge_id', value)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select weighbridge" />
                </SelectTrigger>
                <SelectContent>
                  {weighbridges?.data?.map((wb) => (
                    <SelectItem key={wb.id} value={wb.id.toString()}>
                      {wb.name} - {wb.location}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.weighbridge_id && (
                <p className="text-red-500 text-sm mt-1">{errors.weighbridge_id.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="location_notes">Location Notes</Label>
              <Textarea
                id="location_notes"
                {...register('location_notes')}
                placeholder="Enter location notes (optional)"
                className="mt-1"
                rows={3}
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                {...register('is_active')}
                id="is_active"
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="is_active" className="cursor-pointer">Active</Label>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-primary text-white">
                {editingOutgrower ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Outgrowers;
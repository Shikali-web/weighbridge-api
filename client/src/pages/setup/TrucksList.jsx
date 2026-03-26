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
import { getTrucks, createTruck, updateTruck, deleteTruck } from '../../api/setup';
import { getDrivers } from '../../api/setup';

const truckSchema = z.object({
  plate_no: z.string().min(1, 'Plate number is required'),
  model: z.string().min(1, 'Model is required'),
  capacity_tons: z.number().min(0.1, 'Capacity must be greater than 0'),
  driver_id: z.string().optional(),
  is_active: z.boolean().default(true),
});

const TrucksList = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTruck, setEditingTruck] = useState(null);
  const queryClient = useQueryClient();

  const { data: trucks, isLoading } = useQuery({
    queryKey: ['trucks', searchTerm],
    queryFn: () => getTrucks(searchTerm)
  });

  const { data: drivers } = useQuery({
    queryKey: ['drivers'],
    queryFn: () => getDrivers()
  });

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm({
    resolver: zodResolver(truckSchema),
    defaultValues: {
      plate_no: '',
      model: '',
      capacity_tons: '',
      driver_id: '',
      is_active: true,
    }
  });

  const createMutation = useMutation({
    mutationFn: createTruck,
    onSuccess: () => {
      toast.success('Truck created successfully');
      queryClient.invalidateQueries(['trucks']);
      setIsModalOpen(false);
      reset();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to create truck');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => updateTruck(id, data),
    onSuccess: () => {
      toast.success('Truck updated successfully');
      queryClient.invalidateQueries(['trucks']);
      setIsModalOpen(false);
      setEditingTruck(null);
      reset();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update truck');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: deleteTruck,
    onSuccess: () => {
      toast.success('Truck deleted successfully');
      queryClient.invalidateQueries(['trucks']);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to delete truck');
    }
  });

  const onSubmit = (data) => {
    const formattedData = {
      ...data,
      capacity_tons: parseFloat(data.capacity_tons),
      driver_id: data.driver_id ? parseInt(data.driver_id) : null
    };
    
    if (editingTruck) {
      updateMutation.mutate({ id: editingTruck.id, data: formattedData });
    } else {
      createMutation.mutate(formattedData);
    }
  };

  const handleEdit = (truck) => {
    setEditingTruck(truck);
    setValue('plate_no', truck.plate_no);
    setValue('model', truck.model);
    setValue('capacity_tons', truck.capacity_tons);
    setValue('driver_id', truck.driver_id?.toString() || '');
    setValue('is_active', truck.is_active);
    setIsModalOpen(true);
  };

  const handleAddNew = () => {
    setEditingTruck(null);
    reset();
    setIsModalOpen(true);
  };

  const columns = [
    { key: "plate_no", label: "Plate No" },
    { key: "model", label: "Model" },
    { key: "capacity_tons", label: "Capacity (tons)" },
    { key: "driver_name", label: "Driver" },
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
            title="Delete Truck"
            description={`Are you sure you want to delete ${row.plate_no}? This action cannot be undone.`}
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
          <h3 className="text-lg font-semibold text-gray-900">Trucks</h3>
          <Button onClick={handleAddNew} className="bg-primary text-white">
            <Plus className="h-4 w-4 mr-2" />
            Add Truck
          </Button>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search trucks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        <DataTable
          columns={columns}
          data={trucks?.data || []}
          loading={isLoading}
          emptyMessage="No trucks found"
        />
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTruck ? 'Edit Truck' : 'Add New Truck'}</DialogTitle>
            <DialogDescription>
              {editingTruck ? 'Update truck information' : 'Enter the truck details below'}
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="plate_no">Plate Number</Label>
              <Input
                id="plate_no"
                {...register('plate_no')}
                placeholder="Enter plate number"
                className="mt-1"
              />
              {errors.plate_no && (
                <p className="text-red-500 text-sm mt-1">{errors.plate_no.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="model">Model</Label>
              <Input
                id="model"
                {...register('model')}
                placeholder="Enter truck model"
                className="mt-1"
              />
              {errors.model && (
                <p className="text-red-500 text-sm mt-1">{errors.model.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="capacity_tons">Capacity (Tons)</Label>
              <Input
                id="capacity_tons"
                type="number"
                step="0.1"
                {...register('capacity_tons', { valueAsNumber: true })}
                placeholder="Enter capacity in tons"
                className="mt-1"
              />
              {errors.capacity_tons && (
                <p className="text-red-500 text-sm mt-1">{errors.capacity_tons.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="driver_id">Driver (Optional)</Label>
              <Select
                value={watch('driver_id')}
                onValueChange={(value) => setValue('driver_id', value)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select driver" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {drivers?.data?.map((driver) => (
                    <SelectItem key={driver.id} value={driver.id.toString()}>
                      {driver.name} - {driver.license_no}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                {editingTruck ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default TrucksList;
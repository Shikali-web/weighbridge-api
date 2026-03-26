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
import { getWeighbridges, createWeighbridge, updateWeighbridge, deleteWeighbridge } from '../../api/setup';

const weighbridgeSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  location: z.string().min(1, 'Location is required'),
  is_active: z.boolean().default(true),
});

const Weighbridges = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingWeighbridge, setEditingWeighbridge] = useState(null);
  const queryClient = useQueryClient();

  const { data: weighbridges, isLoading } = useQuery({
    queryKey: ['weighbridges', searchTerm],
    queryFn: () => getWeighbridges(searchTerm)
  });

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm({
    resolver: zodResolver(weighbridgeSchema),
    defaultValues: {
      name: '',
      location: '',
      is_active: true,
    }
  });

  const createMutation = useMutation({
    mutationFn: createWeighbridge,
    onSuccess: () => {
      toast.success('Weighbridge created successfully');
      queryClient.invalidateQueries(['weighbridges']);
      setIsModalOpen(false);
      reset();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to create weighbridge');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => updateWeighbridge(id, data),
    onSuccess: () => {
      toast.success('Weighbridge updated successfully');
      queryClient.invalidateQueries(['weighbridges']);
      setIsModalOpen(false);
      setEditingWeighbridge(null);
      reset();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update weighbridge');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: deleteWeighbridge,
    onSuccess: () => {
      toast.success('Weighbridge deleted successfully');
      queryClient.invalidateQueries(['weighbridges']);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to delete weighbridge');
    }
  });

  const onSubmit = (data) => {
    if (editingWeighbridge) {
      updateMutation.mutate({ id: editingWeighbridge.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (weighbridge) => {
    setEditingWeighbridge(weighbridge);
    setValue('name', weighbridge.name);
    setValue('location', weighbridge.location);
    setValue('is_active', weighbridge.is_active);
    setIsModalOpen(true);
  };

  const handleAddNew = () => {
    setEditingWeighbridge(null);
    reset();
    setIsModalOpen(true);
  };

  const columns = [
    { key: "name", label: "Name" },
    { key: "location", label: "Location" },
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
            title="Delete Weighbridge"
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
          <h3 className="text-lg font-semibold text-gray-900">Weighbridges</h3>
          <Button onClick={handleAddNew} className="bg-primary text-white">
            <Plus className="h-4 w-4 mr-2" />
            Add Weighbridge
          </Button>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search weighbridges..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        <DataTable
          columns={columns}
          data={weighbridges?.data || []}
          loading={isLoading}
          emptyMessage="No weighbridges found"
        />
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingWeighbridge ? 'Edit Weighbridge' : 'Add New Weighbridge'}</DialogTitle>
            <DialogDescription>
              {editingWeighbridge ? 'Update weighbridge information' : 'Enter the weighbridge details below'}
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                {...register('name')}
                placeholder="Enter weighbridge name"
                className="mt-1"
              />
              {errors.name && (
                <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                {...register('location')}
                placeholder="Enter location"
                className="mt-1"
              />
              {errors.location && (
                <p className="text-red-500 text-sm mt-1">{errors.location.message}</p>
              )}
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
                {editingWeighbridge ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Weighbridges;
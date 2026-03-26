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
import { getSupervisors, createSupervisor, updateSupervisor, deleteSupervisor } from '../../api/setup';

const supervisorSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  phone: z.string().min(10, 'Phone number must be at least 10 digits'),
  national_id: z.string().min(1, 'National ID is required'),
  is_active: z.boolean().default(true),
});

const Supervisors = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupervisor, setEditingSupervisor] = useState(null);
  const queryClient = useQueryClient();

  const { data: supervisors, isLoading } = useQuery({
    queryKey: ['supervisors', searchTerm],
    queryFn: () => getSupervisors(searchTerm)
  });

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm({
    resolver: zodResolver(supervisorSchema),
    defaultValues: {
      name: '',
      phone: '',
      national_id: '',
      is_active: true,
    }
  });

  const createMutation = useMutation({
    mutationFn: createSupervisor,
    onSuccess: () => {
      toast.success('Supervisor created successfully');
      queryClient.invalidateQueries(['supervisors']);
      setIsModalOpen(false);
      reset();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to create supervisor');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => updateSupervisor(id, data),
    onSuccess: () => {
      toast.success('Supervisor updated successfully');
      queryClient.invalidateQueries(['supervisors']);
      setIsModalOpen(false);
      setEditingSupervisor(null);
      reset();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update supervisor');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: deleteSupervisor,
    onSuccess: () => {
      toast.success('Supervisor deleted successfully');
      queryClient.invalidateQueries(['supervisors']);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to delete supervisor');
    }
  });

  const onSubmit = (data) => {
    if (editingSupervisor) {
      updateMutation.mutate({ id: editingSupervisor.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (supervisor) => {
    setEditingSupervisor(supervisor);
    setValue('name', supervisor.name);
    setValue('phone', supervisor.phone);
    setValue('national_id', supervisor.national_id);
    setValue('is_active', supervisor.is_active);
    setIsModalOpen(true);
  };

  const handleAddNew = () => {
    setEditingSupervisor(null);
    reset();
    setIsModalOpen(true);
  };

  const columns = [
    { key: "name", label: "Name" },
    { key: "phone", label: "Phone" },
    { key: "national_id", label: "National ID" },
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
            title="Delete Supervisor"
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
          <h3 className="text-lg font-semibold text-gray-900">Supervisors</h3>
          <Button onClick={handleAddNew} className="bg-primary text-white">
            <Plus className="h-4 w-4 mr-2" />
            Add Supervisor
          </Button>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search supervisors..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        <DataTable
          columns={columns}
          data={supervisors?.data || []}
          loading={isLoading}
          emptyMessage="No supervisors found"
        />
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingSupervisor ? 'Edit Supervisor' : 'Add New Supervisor'}</DialogTitle>
            <DialogDescription>
              {editingSupervisor ? 'Update supervisor information' : 'Enter the supervisor details below'}
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                {...register('name')}
                placeholder="Enter full name"
                className="mt-1"
              />
              {errors.name && (
                <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                {...register('phone')}
                placeholder="Enter phone number"
                className="mt-1"
              />
              {errors.phone && (
                <p className="text-red-500 text-sm mt-1">{errors.phone.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="national_id">National ID</Label>
              <Input
                id="national_id"
                {...register('national_id')}
                placeholder="Enter national ID"
                className="mt-1"
              />
              {errors.national_id && (
                <p className="text-red-500 text-sm mt-1">{errors.national_id.message}</p>
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
                {editingSupervisor ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Supervisors;
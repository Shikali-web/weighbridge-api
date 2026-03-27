import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit, Trash2, Search } from 'lucide-react';
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

const TrucksList = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTruck, setEditingTruck] = useState(null);
  const [formData, setFormData] = useState({
    plate_no: '',
    model: '',
    capacity_tons: '',
    driver_id: 'none',
    is_active: true,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();

  const { data: trucks, isLoading, error: trucksError } = useQuery({
    queryKey: ['trucks', searchTerm],
    queryFn: () => getTrucks(searchTerm)
  });

  const { data: drivers, isLoading: driversLoading } = useQuery({
    queryKey: ['drivers'],
    queryFn: () => getDrivers()
  });

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleSelectChange = (name, value) => {
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const resetForm = () => {
    setFormData({
      plate_no: '',
      model: '',
      capacity_tons: '',
      driver_id: 'none',
      is_active: true,
    });
    setEditingTruck(null);
  };

  const createMutation = useMutation({
    mutationFn: createTruck,
    onSuccess: () => {
      toast.success('Truck created successfully');
      queryClient.invalidateQueries(['trucks']);
      setIsModalOpen(false);
      resetForm();
      setIsSubmitting(false);
    },
    onError: (error) => {
      console.error('Create error:', error);
      toast.error(error.message || 'Failed to create truck');
      setIsSubmitting(false);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => updateTruck(id, data),
    onSuccess: () => {
      toast.success('Truck updated successfully');
      queryClient.invalidateQueries(['trucks']);
      setIsModalOpen(false);
      resetForm();
      setIsSubmitting(false);
    },
    onError: (error) => {
      console.error('Update error:', error);
      toast.error(error.message || 'Failed to update truck');
      setIsSubmitting(false);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: deleteTruck,
    onSuccess: () => {
      toast.success('Truck deleted successfully');
      queryClient.invalidateQueries(['trucks']);
    },
    onError: (error) => {
      console.error('Delete error:', error);
      toast.error(error.message || 'Failed to delete truck');
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    if (!formData.plate_no.trim()) {
      toast.error('Plate number is required');
      setIsSubmitting(false);
      return;
    }
    if (!formData.model.trim()) {
      toast.error('Model is required');
      setIsSubmitting(false);
      return;
    }
    if (!formData.capacity_tons || parseFloat(formData.capacity_tons) <= 0) {
      toast.error('Valid capacity is required');
      setIsSubmitting(false);
      return;
    }

    const dataToSubmit = {
      plate_no: formData.plate_no.trim(),
      model: formData.model.trim(),
      capacity_tons: parseFloat(formData.capacity_tons),
      driver_id: formData.driver_id === 'none' ? null : parseInt(formData.driver_id),
      is_active: formData.is_active,
    };

    if (editingTruck) {
      updateMutation.mutate({ id: editingTruck.id, data: dataToSubmit });
    } else {
      createMutation.mutate(dataToSubmit);
    }
  };

  const handleEdit = (truck) => {
    setEditingTruck(truck);
    setFormData({
      plate_no: truck.plate_no || '',
      model: truck.model || '',
      capacity_tons: truck.capacity_tons || '',
      driver_id: truck.driver_id ? truck.driver_id.toString() : 'none',
      is_active: truck.is_active !== undefined ? truck.is_active : true,
    });
    setIsModalOpen(true);
  };

  const handleAddNew = () => {
    resetForm();
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

  if (trucksError) {
    return (
      <div className="p-6 text-center text-red-600">
        Error loading trucks: {trucksError.message}
      </div>
    );
  }

  return (
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
            placeholder="Search trucks by plate or model..."
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

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingTruck ? 'Edit Truck' : 'Add New Truck'}</DialogTitle>
            <DialogDescription>
              {editingTruck ? 'Update truck information' : 'Enter the truck details below'}
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="plate_no">Plate Number *</Label>
              <Input
                id="plate_no"
                name="plate_no"
                value={formData.plate_no}
                onChange={handleInputChange}
                placeholder="Enter plate number (e.g., KCA 123A)"
                className="mt-1"
                required
              />
            </div>

            <div>
              <Label htmlFor="model">Model *</Label>
              <Input
                id="model"
                name="model"
                value={formData.model}
                onChange={handleInputChange}
                placeholder="Enter truck model (e.g., Fuso, Isuzu)"
                className="mt-1"
                required
              />
            </div>

            <div>
              <Label htmlFor="capacity_tons">Capacity (Tons) *</Label>
              <Input
                id="capacity_tons"
                name="capacity_tons"
                type="number"
                step="0.1"
                value={formData.capacity_tons}
                onChange={handleInputChange}
                placeholder="Enter capacity in tons"
                className="mt-1"
                required
              />
            </div>

            <div>
              <Label htmlFor="driver_id">Driver (Optional)</Label>
              <Select
                value={formData.driver_id}
                onValueChange={(value) => handleSelectChange('driver_id', value)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select driver" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
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
                id="is_active"
                name="is_active"
                checked={formData.is_active}
                onChange={handleInputChange}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="is_active" className="cursor-pointer">Active</Label>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-primary text-white" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : (editingTruck ? 'Update' : 'Create')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TrucksList;
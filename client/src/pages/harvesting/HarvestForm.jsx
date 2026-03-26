import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Calculator } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
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
import { getHeadmen, getOutgrowers } from '../../api/setup';
import { createHarvestAssignment, updateHarvestAssignment } from '../../api/harvest';

const harvestSchema = z.object({
  headman_id: z.string().min(1, 'Headman is required'),
  outgrower_id: z.string().min(1, 'Outgrower is required'),
  assignment_date: z.string().min(1, 'Assignment date is required'),
  turnup: z.number().min(0.1, 'Turnup must be greater than 0'),
  notes: z.string().optional(),
  status: z.string().default('pending'),
});

const HarvestForm = ({ isOpen, onClose, assignment = null }) => {
  const queryClient = useQueryClient();
  const [selectedOutgrower, setSelectedOutgrower] = useState(null);
  const [expectedTonnage, setExpectedTonnage] = useState(null);

  const { data: headmen, isLoading: headmenLoading } = useQuery({
    queryKey: ['headmen'],
    queryFn: () => getHeadmen(),
    enabled: isOpen,
  });

  const { data: outgrowers, isLoading: outgrowersLoading } = useQuery({
    queryKey: ['outgrowers'],
    queryFn: () => getOutgrowers(),
    enabled: isOpen,
  });

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm({
    resolver: zodResolver(harvestSchema),
    defaultValues: {
      headman_id: assignment?.headman_id?.toString() || '',
      outgrower_id: assignment?.outgrower_id?.toString() || '',
      assignment_date: assignment?.assignment_date?.split('T')[0] || new Date().toISOString().split('T')[0],
      turnup: assignment?.turnup || '',
      notes: assignment?.notes || '',
      status: assignment?.status || 'pending',
    }
  });

  const watchOutgrowerId = watch('outgrower_id');
  const watchTurnup = watch('turnup');

  // Calculate expected tonnage when turnup changes
  useEffect(() => {
    if (watchTurnup && watchTurnup > 0) {
      const calculated = watchTurnup * 2.25;
      setExpectedTonnage(calculated);
    } else {
      setExpectedTonnage(null);
    }
  }, [watchTurnup]);

  // Load outgrower details when selected
  useEffect(() => {
    if (watchOutgrowerId && outgrowers?.data) {
      const outgrower = outgrowers.data.find(o => o.id.toString() === watchOutgrowerId);
      setSelectedOutgrower(outgrower);
    }
  }, [watchOutgrowerId, outgrowers]);

  const createMutation = useMutation({
    mutationFn: createHarvestAssignment,
    onSuccess: () => {
      toast.success('Harvest assignment created successfully');
      queryClient.invalidateQueries(['harvest-assignments']);
      onClose();
      reset();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to create harvest assignment');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => updateHarvestAssignment(id, data),
    onSuccess: () => {
      toast.success('Harvest assignment updated successfully');
      queryClient.invalidateQueries(['harvest-assignments']);
      onClose();
      reset();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update harvest assignment');
    }
  });

  const onSubmit = (data) => {
    const formattedData = {
      headman_id: parseInt(data.headman_id),
      outgrower_id: parseInt(data.outgrower_id),
      assignment_date: data.assignment_date,
      turnup: parseFloat(data.turnup),
      expected_tonnage: expectedTonnage || parseFloat(data.turnup) * 2.25,
      notes: data.notes,
      status: data.status,
    };

    if (assignment) {
      updateMutation.mutate({ id: assignment.id, data: formattedData });
    } else {
      createMutation.mutate(formattedData);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{assignment ? 'Edit Harvest Assignment' : 'New Harvest Assignment'}</DialogTitle>
          <DialogDescription>
            {assignment ? 'Update harvest assignment details' : 'Create a new harvest assignment'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="headman_id">Headman</Label>
            <Select
              value={watch('headman_id')}
              onValueChange={(value) => setValue('headman_id', value)}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder={headmenLoading ? "Loading..." : "Select headman"} />
              </SelectTrigger>
              <SelectContent>
                {headmen?.data?.map((headman) => (
                  <SelectItem key={headman.id} value={headman.id.toString()}>
                    {headman.name} - {headman.phone}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.headman_id && (
              <p className="text-red-500 text-sm mt-1">{errors.headman_id.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="outgrower_id">Outgrower</Label>
            <Select
              value={watch('outgrower_id')}
              onValueChange={(value) => setValue('outgrower_id', value)}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder={outgrowersLoading ? "Loading..." : "Select outgrower"} />
              </SelectTrigger>
              <SelectContent>
                {outgrowers?.data?.map((outgrower) => (
                  <SelectItem key={outgrower.id} value={outgrower.id.toString()}>
                    {outgrower.name} - {outgrower.field_code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.outgrower_id && (
              <p className="text-red-500 text-sm mt-1">{errors.outgrower_id.message}</p>
            )}
          </div>

          {selectedOutgrower && (
            <div className="bg-gray-50 p-3 rounded-lg text-sm">
              <p><strong>Field Code:</strong> {selectedOutgrower.field_code}</p>
              <p><strong>Field Size:</strong> {selectedOutgrower.field_size_ha} ha</p>
              <p><strong>Distance Band:</strong> {selectedOutgrower.band_code || 'Not set'}</p>
              <p><strong>Weighbridge:</strong> {selectedOutgrower.weighbridge_name || 'Not set'}</p>
            </div>
          )}

          <div>
            <Label htmlFor="assignment_date">Assignment Date</Label>
            <Input
              id="assignment_date"
              type="date"
              {...register('assignment_date')}
              className="mt-1"
            />
            {errors.assignment_date && (
              <p className="text-red-500 text-sm mt-1">{errors.assignment_date.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="turnup">Turnup (Cane bundles)</Label>
            <Input
              id="turnup"
              type="number"
              step="0.1"
              {...register('turnup', { valueAsNumber: true })}
              placeholder="Enter number of cane bundles"
              className="mt-1"
            />
            {errors.turnup && (
              <p className="text-red-500 text-sm mt-1">{errors.turnup.message}</p>
            )}
          </div>

          {expectedTonnage && (
            <div className="bg-blue-50 p-3 rounded-lg">
              <div className="flex items-center gap-2">
                <Calculator className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-900">Expected Tonnage:</span>
                <span className="text-lg font-bold text-blue-900">{expectedTonnage.toFixed(3)} T</span>
              </div>
              <p className="text-xs text-blue-700 mt-1">Calculated: Turnup × 2.25</p>
            </div>
          )}

          <div>
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              {...register('notes')}
              placeholder="Enter any additional notes"
              className="mt-1"
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" className="bg-primary text-white" disabled={createMutation.isLoading || updateMutation.isLoading}>
              {createMutation.isLoading || updateMutation.isLoading ? 'Saving...' : (assignment ? 'Update' : 'Create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default HarvestForm;
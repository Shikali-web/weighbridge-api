import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
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
import { getWeighbridges, getSupervisors } from '../../api/setup';
import { getHarvestAssignments } from '../../api/harvest';
import { createLoadingRecord, updateLoadingRecord, computeLoadingFinancials } from '../../api/loading';
import { formatTons } from '../../utils/formatters';

const loadingSchema = z.object({
  assignment_id: z.string().min(1, 'Harvest assignment is required'),
  weighbridge_id: z.string().min(1, 'Weighbridge is required'),
  supervisor_id: z.string().min(1, 'Supervisor is required'),
  load_date: z.string().min(1, 'Load date is required'),
  tons_loaded: z.number().min(0.1, 'Tons loaded must be greater than 0'),
  trip_count: z.number().min(1, 'Trip count must be at least 1'),
  notes: z.string().optional(),
  status: z.string().default('pending'),
});

const LoadingForm = ({ isOpen, onClose, record = null }) => {
  const queryClient = useQueryClient();
  const [selectedAssignment, setSelectedAssignment] = useState(null);

  const { data: weighbridges } = useQuery({
    queryKey: ['weighbridges'],
    queryFn: () => getWeighbridges(),
    enabled: isOpen,
  });

  const { data: supervisors } = useQuery({
    queryKey: ['supervisors'],
    queryFn: () => getSupervisors(),
    enabled: isOpen,
  });

  const { data: assignments } = useQuery({
    queryKey: ['harvest-assignments-for-loading'],
    queryFn: () => getHarvestAssignments({ status: 'in_progress,completed' }),
    enabled: isOpen,
  });

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm({
    resolver: zodResolver(loadingSchema),
    defaultValues: {
      assignment_id: record?.assignment_id?.toString() || '',
      weighbridge_id: record?.weighbridge_id?.toString() || '',
      supervisor_id: record?.supervisor_id?.toString() || '',
      load_date: record?.load_date?.split('T')[0] || new Date().toISOString().split('T')[0],
      tons_loaded: record?.tons_loaded || '',
      trip_count: record?.trip_count || '',
      notes: record?.notes || '',
      status: record?.status || 'pending',
    }
  });

  const watchAssignmentId = watch('assignment_id');

  // Load assignment details when selected
  useEffect(() => {
    if (watchAssignmentId && assignments?.data) {
      const assignment = assignments.data.find(a => a.id.toString() === watchAssignmentId);
      setSelectedAssignment(assignment);
    } else {
      setSelectedAssignment(null);
    }
  }, [watchAssignmentId, assignments]);

  const createMutation = useMutation({
    mutationFn: createLoadingRecord,
    onSuccess: async (response) => {
      toast.success('Loading record created successfully');
      // Compute financials automatically
      await computeLoadingFinancials(response.data.id);
      queryClient.invalidateQueries(['loading-records']);
      onClose();
      reset();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to create loading record');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => updateLoadingRecord(id, data),
    onSuccess: async (response) => {
      toast.success('Loading record updated successfully');
      // Recompute financials
      await computeLoadingFinancials(response.data.id);
      queryClient.invalidateQueries(['loading-records']);
      onClose();
      reset();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update loading record');
    }
  });

  const onSubmit = (data) => {
    const formattedData = {
      assignment_id: parseInt(data.assignment_id),
      weighbridge_id: parseInt(data.weighbridge_id),
      supervisor_id: parseInt(data.supervisor_id),
      load_date: data.load_date,
      tons_loaded: parseFloat(data.tons_loaded),
      trip_count: parseInt(data.trip_count),
      notes: data.notes,
      status: data.status,
    };

    if (record) {
      updateMutation.mutate({ id: record.id, data: formattedData });
    } else {
      createMutation.mutate(formattedData);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{record ? 'Edit Loading Record' : 'New Loading Record'}</DialogTitle>
          <DialogDescription>
            {record ? 'Update loading record details' : 'Create a new loading record'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="assignment_id">Harvest Assignment</Label>
            <Select
              value={watch('assignment_id')}
              onValueChange={(value) => setValue('assignment_id', value)}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select harvest assignment" />
              </SelectTrigger>
              <SelectContent>
                {assignments?.data?.map((assignment) => (
                  <SelectItem key={assignment.id} value={assignment.id.toString()}>
                    {assignment.field_code} - {assignment.outgrower_name} ({formatTons(assignment.expected_tonnage)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.assignment_id && (
              <p className="text-red-500 text-sm mt-1">{errors.assignment_id.message}</p>
            )}
          </div>

          {selectedAssignment && (
            <div className="bg-gray-50 p-3 rounded-lg text-sm">
              <p><strong>Outgrower:</strong> {selectedAssignment.outgrower_name}</p>
              <p><strong>Headman:</strong> {selectedAssignment.headman_name}</p>
              <p><strong>Expected Tons:</strong> {formatTons(selectedAssignment.expected_tonnage)}</p>
              <p><strong>Actual Tons:</strong> {selectedAssignment.actual_tonnage ? formatTons(selectedAssignment.actual_tonnage) : 'Not recorded'}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="weighbridge_id">Weighbridge</Label>
              <Select
                value={watch('weighbridge_id')}
                onValueChange={(value) => setValue('weighbridge_id', value)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select" />
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
              <Label htmlFor="supervisor_id">Supervisor</Label>
              <Select
                value={watch('supervisor_id')}
                onValueChange={(value) => setValue('supervisor_id', value)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {supervisors?.data?.map((sup) => (
                    <SelectItem key={sup.id} value={sup.id.toString()}>
                      {sup.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.supervisor_id && (
                <p className="text-red-500 text-sm mt-1">{errors.supervisor_id.message}</p>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="load_date">Load Date</Label>
            <Input
              id="load_date"
              type="date"
              {...register('load_date')}
              className="mt-1"
            />
            {errors.load_date && (
              <p className="text-red-500 text-sm mt-1">{errors.load_date.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="tons_loaded">Tons Loaded</Label>
              <Input
                id="tons_loaded"
                type="number"
                step="0.001"
                {...register('tons_loaded', { valueAsNumber: true })}
                placeholder="Enter tons"
                className="mt-1"
              />
              {errors.tons_loaded && (
                <p className="text-red-500 text-sm mt-1">{errors.tons_loaded.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="trip_count">Number of Trips</Label>
              <Input
                id="trip_count"
                type="number"
                {...register('trip_count', { valueAsNumber: true })}
                placeholder="Enter trip count"
                className="mt-1"
              />
              {errors.trip_count && (
                <p className="text-red-500 text-sm mt-1">{errors.trip_count.message}</p>
              )}
            </div>
          </div>

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
              {createMutation.isLoading || updateMutation.isLoading ? 'Saving...' : (record ? 'Update' : 'Create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default LoadingForm;
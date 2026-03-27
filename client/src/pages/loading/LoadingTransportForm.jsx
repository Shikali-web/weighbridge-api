import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Truck, Calculator, AlertCircle, Info } from 'lucide-react';
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
import { getWeighbridges, getSupervisors, getTrucks, getDrivers, getDistanceBands } from '../../api/setup';
import { createLoadingRecord } from '../../api/loading';
import { createTransportTrip } from '../../api/transport';
import { formatCurrency, formatTons } from '../../utils/formatters';

const loadingTransportSchema = z.object({
  assignment_id: z.string().min(1, 'Harvest assignment is required'),
  weighbridge_id: z.string().min(1, 'Weighbridge is required'),
  supervisor_id: z.string().min(1, 'Supervisor is required'),
  truck_id: z.string().min(1, 'Truck is required'),
  driver_id: z.string().min(1, 'Driver is required'),
  distance_band_id: z.string().min(1, 'Distance band is required'),
  load_date: z.string().min(1, 'Load date is required'),
  tons_loaded: z.number().min(0.1, 'Tons loaded must be greater than 0'),
  notes: z.string().optional(),
});

const LoadingTransportForm = ({ isOpen, onClose, record = null }) => {
  const queryClient = useQueryClient();
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [selectedDistanceBand, setSelectedDistanceBand] = useState(null);
  const [remainingTons, setRemainingTons] = useState(0);
  const [calculations, setCalculations] = useState({
    transport_revenue: 0,
    driver_payment: 0,
    sagib_retention: 0,
    loading_factory_revenue: 0,
    loading_sagib_revenue: 0,
    loader_payment: 0,
    supervisor_payment: 0,
    total_sagib_net: 0,
  });
  const [isProcessing, setIsProcessing] = useState(false);

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

  const { data: trucks } = useQuery({
    queryKey: ['trucks'],
    queryFn: () => getTrucks(),
    enabled: isOpen,
  });

  const { data: drivers } = useQuery({
    queryKey: ['drivers'],
    queryFn: () => getDrivers(),
    enabled: isOpen,
  });

  const { data: distanceBands } = useQuery({
    queryKey: ['distance-bands'],
    queryFn: () => getDistanceBands(),
    enabled: isOpen,
  });

  // Get available assignments (not manually completed)
  const { data: assignments } = useQuery({
    queryKey: ['available-assignments'],
    queryFn: async () => {
      const response = await fetch('http://localhost:5000/api/loading-records/available-assignments');
      const data = await response.json();
      return data;
    },
    enabled: isOpen,
  });

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm({
    resolver: zodResolver(loadingTransportSchema),
    defaultValues: {
      assignment_id: '',
      weighbridge_id: '',
      supervisor_id: '',
      truck_id: '',
      driver_id: '',
      distance_band_id: '',
      load_date: new Date().toISOString().split('T')[0],
      tons_loaded: '',
      notes: '',
    }
  });

  const watchAssignmentId = watch('assignment_id');
  const watchTruckId = watch('truck_id');
  const watchTonsLoaded = watch('tons_loaded');
  const watchDistanceBandId = watch('distance_band_id');

  // Load assignment details when selected
  useEffect(() => {
    if (watchAssignmentId && assignments?.data) {
      const assignment = assignments.data.find(a => a.id.toString() === watchAssignmentId);
      setSelectedAssignment(assignment);
      if (assignment) {
        const remaining = assignment.remaining_tonnage || assignment.expected_tonnage;
        setRemainingTons(Math.max(0, remaining));
      }
    } else {
      setSelectedAssignment(null);
      setRemainingTons(0);
    }
  }, [watchAssignmentId, assignments]);

  // Auto-select driver when truck is selected
  useEffect(() => {
    if (watchTruckId && trucks?.data) {
      const truck = trucks.data.find(t => t.id.toString() === watchTruckId);
      if (truck && truck.driver_id) {
        setValue('driver_id', truck.driver_id.toString());
      }
    }
  }, [watchTruckId, trucks, setValue]);

  // Load distance band details
  useEffect(() => {
    if (watchDistanceBandId && distanceBands?.data) {
      const band = distanceBands.data.find(b => b.id.toString() === watchDistanceBandId);
      setSelectedDistanceBand(band);
    }
  }, [watchDistanceBandId, distanceBands]);

  // Calculate financials
  useEffect(() => {
    if (watchTonsLoaded > 0 && selectedDistanceBand && selectedAssignment) {
      const tons = parseFloat(watchTonsLoaded);
      
      const transport_rate = selectedDistanceBand.transport_rate_per_ton;
      const transport_revenue = tons * transport_rate;
      const driver_payment = transport_revenue * 0.40;
      const sagib_retention = transport_revenue * 0.60;
      
      const loading_factory_rate = 150;
      const loading_sagib_rate = 120;
      const supervisor_per_trip = 100;
      
      const loading_factory_revenue = tons * loading_factory_rate;
      const loading_sagib_revenue = tons * loading_sagib_rate;
      const loader_payment = loading_sagib_revenue;
      const supervisor_payment = supervisor_per_trip;
      const loading_gross_profit = loading_factory_revenue - loader_payment - supervisor_payment;
      
      setCalculations({
        transport_revenue,
        driver_payment,
        sagib_retention,
        loading_factory_revenue,
        loading_sagib_revenue,
        loader_payment,
        supervisor_payment,
        total_sagib_net: sagib_retention + loading_gross_profit,
      });
    } else {
      setCalculations({
        transport_revenue: 0,
        driver_payment: 0,
        sagib_retention: 0,
        loading_factory_revenue: 0,
        loading_sagib_revenue: 0,
        loader_payment: 0,
        supervisor_payment: 0,
        total_sagib_net: 0,
      });
    }
  }, [watchTonsLoaded, selectedDistanceBand, selectedAssignment]);

  const createLoadingMutation = useMutation({
    mutationFn: createLoadingRecord,
    onSuccess: async (response) => {
      const loadingRecord = response.data;
      
      await createTransportTrip({
        truck_id: parseInt(watchTruckId),
        driver_id: parseInt(watch('driver_id')),
        outgrower_id: selectedAssignment.outgrower_id,
        weighbridge_id: parseInt(watch('weighbridge_id')),
        distance_band_id: parseInt(watchDistanceBandId),
        trip_date: watch('load_date'),
        tons_transported: parseFloat(watchTonsLoaded),
        notes: watch('notes'),
      });
      
      return loadingRecord;
    }
  });

  const onSubmit = async (data) => {
    const tonsToLoad = parseFloat(data.tons_loaded);
    
    // Show warning but don't block if exceeding expectation
    if (tonsToLoad > remainingTons && remainingTons > 0) {
      toast.warning(`This load (${formatTons(tonsToLoad)}) exceeds the expected remaining (${formatTons(remainingTons)}). Actual harvest is above expectation.`, {
        duration: 5000,
      });
    }

    setIsProcessing(true);
    
    try {
      await createLoadingMutation.mutateAsync({
        assignment_id: parseInt(data.assignment_id),
        weighbridge_id: parseInt(data.weighbridge_id),
        supervisor_id: parseInt(data.supervisor_id),
        load_date: data.load_date,
        tons_loaded: tonsToLoad,
        trip_count: 1,
        notes: data.notes,
        status: 'completed',
      });
      
      const newTotal = (selectedAssignment.actual_tonnage || 0) + tonsToLoad;
      const variance = newTotal - selectedAssignment.expected_tonnage;
      const varianceText = variance > 0 
        ? ` (${formatTons(Math.abs(variance))} above expectation)` 
        : variance < 0 
          ? ` (${formatTons(Math.abs(variance))} below expectation)` 
          : '';
      
      toast.success(
        `Load recorded successfully! Total: ${formatTons(newTotal)} / Expected: ${formatTons(selectedAssignment.expected_tonnage)}${varianceText}`
      );
      
      queryClient.invalidateQueries(['loading-records']);
      queryClient.invalidateQueries(['transport-trips']);
      queryClient.invalidateQueries(['harvest-assignments']);
      queryClient.invalidateQueries(['available-assignments']);
      
      onClose();
      reset();
    } catch (error) {
      console.error('Error recording load:', error);
      toast.error(error.message || 'Failed to record load');
    } finally {
      setIsProcessing(false);
    }
  };

  const currentTotal = selectedAssignment?.actual_tonnage || 0;
  const variance = currentTotal - (selectedAssignment?.expected_tonnage || 0);
  const isOverExpected = variance > 0;
  const isUnderExpected = variance < 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="sticky top-0 bg-white pb-4 border-b z-10">
          <DialogTitle>Record Field Loading & Transport</DialogTitle>
          <DialogDescription>
            Record a truck load from the field. This will create both a loading record and a transport trip.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
          {/* Harvest Assignment Selection */}
          <div>
            <Label htmlFor="assignment_id">Select Field to Load *</Label>
            <Select
              value={watch('assignment_id')}
              onValueChange={(value) => setValue('assignment_id', value)}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select harvest assignment" />
              </SelectTrigger>
              <SelectContent>
                {assignments?.data?.map((assignment) => {
                  const loaded = assignment.actual_tonnage || 0;
                  const expected = assignment.expected_tonnage;
                  const remaining = expected - loaded;
                  const percentComplete = (loaded / expected) * 100;
                  const isOver = loaded > expected;
                  return (
                    <SelectItem key={assignment.id} value={assignment.id.toString()}>
                      {assignment.field_code} - {assignment.outgrower_name} 
                      ({formatTons(loaded)}/{formatTons(expected)} T - 
                      {isOver ? 'OVER' : `${percentComplete.toFixed(1)}% loaded`})
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            {errors.assignment_id && (
              <p className="text-red-500 text-sm mt-1">{errors.assignment_id.message}</p>
            )}
          </div>

          {selectedAssignment && (
            <div className={`p-4 rounded-lg text-sm space-y-2 ${
              isOverExpected ? 'bg-amber-50 border border-amber-200' : 
              isUnderExpected ? 'bg-blue-50 border border-blue-200' : 
              'bg-gray-50'
            }`}>
              <div className="flex justify-between items-center">
                <span className="font-medium">Field Loading Status:</span>
                <span className={`px-2 py-0.5 rounded-full text-xs ${
                  remainingTons <= 0 && !isOverExpected ? 'bg-green-100 text-green-800' : 
                  isOverExpected ? 'bg-amber-100 text-amber-800' : 
                  'bg-blue-100 text-blue-800'
                }`}>
                  {isOverExpected ? 'OVER EXPECTATION' : 
                   remainingTons <= 0 ? 'FULLY LOADED' : 
                   `${formatTons(remainingTons)} REMAINING`}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-300 ${
                    isOverExpected ? 'bg-amber-500' : 'bg-primary'
                  }`}
                  style={{ width: `${Math.min(((selectedAssignment.actual_tonnage || 0) / selectedAssignment.expected_tonnage * 100), 100)}%` }}
                />
              </div>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <p><strong>Outgrower:</strong> {selectedAssignment.outgrower_name}</p>
                <p><strong>Field Code:</strong> {selectedAssignment.field_code}</p>
                <p><strong>Expected Harvest:</strong> {formatTons(selectedAssignment.expected_tonnage)}</p>
                <p><strong>Loaded So Far:</strong> {formatTons(selectedAssignment.actual_tonnage || 0)}</p>
              </div>
              
              {isOverExpected && (
                <div className="flex items-center gap-2 text-amber-700 bg-amber-100 p-2 rounded mt-2">
                  <Info className="h-4 w-4" />
                  <span className="text-xs">Actual harvest is {formatTons(Math.abs(variance))} above expectation</span>
                </div>
              )}
              
              {isUnderExpected && variance < 0 && (
                <div className="flex items-center gap-2 text-blue-700 bg-blue-100 p-2 rounded mt-2">
                  <Info className="h-4 w-4" />
                  <span className="text-xs">Actual harvest is {formatTons(Math.abs(variance))} below expectation</span>
                </div>
              )}
              
              <p className={`font-medium flex items-center gap-1 ${
                isOverExpected ? 'text-amber-600' : 'text-green-600'
              }`}>
                <Truck className="h-3 w-3" />
                Available to Load: {formatTons(Math.max(0, remainingTons))}
                {isOverExpected && " (You can load more than expected)"}
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="weighbridge_id">Weighbridge *</Label>
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
              <Label htmlFor="supervisor_id">Supervisor *</Label>
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="truck_id">Truck *</Label>
              <Select
                value={watch('truck_id')}
                onValueChange={(value) => setValue('truck_id', value)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select truck" />
                </SelectTrigger>
                <SelectContent>
                  {trucks?.data?.map((truck) => (
                    <SelectItem key={truck.id} value={truck.id.toString()}>
                      {truck.plate_no} - {truck.model} ({truck.capacity_tons} T)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.truck_id && (
                <p className="text-red-500 text-sm mt-1">{errors.truck_id.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="driver_id">Driver *</Label>
              <Select
                value={watch('driver_id')}
                onValueChange={(value) => setValue('driver_id', value)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select driver" />
                </SelectTrigger>
                <SelectContent>
                  {drivers?.data?.map((driver) => (
                    <SelectItem key={driver.id} value={driver.id.toString()}>
                      {driver.name} - {driver.license_no}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.driver_id && (
                <p className="text-red-500 text-sm mt-1">{errors.driver_id.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="distance_band_id">Distance Band *</Label>
              <Select
                value={watch('distance_band_id')}
                onValueChange={(value) => setValue('distance_band_id', value)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select band" />
                </SelectTrigger>
                <SelectContent>
                  {distanceBands?.data?.map((band) => (
                    <SelectItem key={band.id} value={band.id.toString()}>
                      {band.band_code} - {band.min_km}-{band.max_km} km ({formatCurrency(band.transport_rate_per_ton)}/ton)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.distance_band_id && (
                <p className="text-red-500 text-sm mt-1">{errors.distance_band_id.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="load_date">Load Date *</Label>
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
          </div>

          <div>
            <Label htmlFor="tons_loaded">Tons Loaded (This Trip) *</Label>
            <Input
              id="tons_loaded"
              type="number"
              step="0.001"
              {...register('tons_loaded', { valueAsNumber: true })}
              placeholder="Enter tons loaded on this trip"
              className="mt-1"
            />
            {errors.tons_loaded && (
              <p className="text-red-500 text-sm mt-1">{errors.tons_loaded.message}</p>
            )}
            {watchTonsLoaded > remainingTons && remainingTons > 0 && !isOverExpected && (
              <p className="text-amber-600 text-sm mt-1 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                Warning: This load exceeds remaining expected tonnage. Actual harvest will be above expectation.
              </p>
            )}
            {watchTonsLoaded > 0 && isOverExpected && (
              <p className="text-amber-600 text-sm mt-1 flex items-center gap-1">
                <Info className="h-3 w-3" />
                You are adding to an already over-expectation harvest.
              </p>
            )}
          </div>

          {/* Financial Preview */}
          {watchTonsLoaded > 0 && selectedDistanceBand && (
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Calculator className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-900">Financial Breakdown for this Load:</span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-gray-600">Transport Revenue:</p>
                  <p className="font-medium">{formatCurrency(calculations.transport_revenue)}</p>
                  <p className="text-gray-600 mt-1">Driver Payment (40%):</p>
                  <p className="font-medium">{formatCurrency(calculations.driver_payment)}</p>
                  <p className="text-gray-600 mt-1">Sagib Retention (60%):</p>
                  <p className="font-medium">{formatCurrency(calculations.sagib_retention)}</p>
                </div>
                <div>
                  <p className="text-gray-600">Loading Revenue:</p>
                  <p className="font-medium">{formatCurrency(calculations.loading_factory_revenue)}</p>
                  <p className="text-gray-600 mt-1">Loader Payment:</p>
                  <p className="font-medium">{formatCurrency(calculations.loader_payment)}</p>
                  <p className="text-gray-600 mt-1">Supervisor Payment:</p>
                  <p className="font-medium">{formatCurrency(calculations.supervisor_payment)}</p>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-green-200">
                <p className="text-gray-600">Total Sagib Net from this Load:</p>
                <p className="text-xl font-bold text-primary">{formatCurrency(calculations.total_sagib_net)}</p>
              </div>
            </div>
          )}

          <div>
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              {...register('notes')}
              placeholder="Enter any additional notes (e.g., truck condition, delays, weather conditions, etc.)"
              className="mt-1"
              rows={3}
            />
          </div>

          <DialogFooter className="sticky bottom-0 bg-white pt-4 border-t mt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="bg-primary text-white" 
              disabled={isProcessing || watchTonsLoaded <= 0 || !selectedAssignment}
            >
              {isProcessing ? 'Processing...' : <><Truck className="h-4 w-4 mr-2" /> Record Load & Transport</>}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default LoadingTransportForm;
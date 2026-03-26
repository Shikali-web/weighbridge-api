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
import { getTrucks, getDrivers, getOutgrowers, getWeighbridges, getDistanceBands } from '../../api/setup';
import { createTransportTrip, updateTransportTrip } from '../../api/transport';
import { formatCurrency } from '../../utils/formatters';

const transportSchema = z.object({
  truck_id: z.string().min(1, 'Truck is required'),
  driver_id: z.string().min(1, 'Driver is required'),
  outgrower_id: z.string().min(1, 'Outgrower is required'),
  weighbridge_id: z.string().min(1, 'Weighbridge is required'),
  distance_band_id: z.string().min(1, 'Distance band is required'),
  trip_date: z.string().min(1, 'Trip date is required'),
  tons_transported: z.number().min(0.1, 'Tons must be greater than 0'),
  notes: z.string().optional(),
});

const TransportForm = ({ isOpen, onClose, trip = null }) => {
  const queryClient = useQueryClient();
  const [selectedOutgrower, setSelectedOutgrower] = useState(null);
  const [selectedDistanceBand, setSelectedDistanceBand] = useState(null);
  const [calculations, setCalculations] = useState({
    total_revenue: 0,
    driver_payment: 0,
    sagib_retention: 0,
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

  const { data: outgrowers } = useQuery({
    queryKey: ['outgrowers'],
    queryFn: () => getOutgrowers(),
    enabled: isOpen,
  });

  const { data: weighbridges } = useQuery({
    queryKey: ['weighbridges'],
    queryFn: () => getWeighbridges(),
    enabled: isOpen,
  });

  const { data: distanceBands } = useQuery({
    queryKey: ['distance-bands'],
    queryFn: () => getDistanceBands(),
    enabled: isOpen,
  });

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm({
    resolver: zodResolver(transportSchema),
    defaultValues: {
      truck_id: trip?.truck_id?.toString() || '',
      driver_id: trip?.driver_id?.toString() || '',
      outgrower_id: trip?.outgrower_id?.toString() || '',
      weighbridge_id: trip?.weighbridge_id?.toString() || '',
      distance_band_id: trip?.distance_band_id?.toString() || '',
      trip_date: trip?.trip_date?.split('T')[0] || new Date().toISOString().split('T')[0],
      tons_transported: trip?.tons_transported || '',
      notes: trip?.notes || '',
    }
  });

  const watchOutgrowerId = watch('outgrower_id');
  const watchDistanceBandId = watch('distance_band_id');
  const watchTonsTransported = watch('tons_transported');

  // Load outgrower details when selected
  useEffect(() => {
    if (watchOutgrowerId && outgrowers?.data) {
      const outgrower = outgrowers.data.find(o => o.id.toString() === watchOutgrowerId);
      setSelectedOutgrower(outgrower);
      if (outgrower?.distance_band_id) {
        setValue('distance_band_id', outgrower.distance_band_id.toString());
      }
      if (outgrower?.weighbridge_id) {
        setValue('weighbridge_id', outgrower.weighbridge_id.toString());
      }
    } else {
      setSelectedOutgrower(null);
    }
  }, [watchOutgrowerId, outgrowers, setValue]);

  // Load distance band details when selected
  useEffect(() => {
    if (watchDistanceBandId && distanceBands?.data) {
      const band = distanceBands.data.find(b => b.id.toString() === watchDistanceBandId);
      setSelectedDistanceBand(band);
    } else {
      setSelectedDistanceBand(null);
    }
  }, [watchDistanceBandId, distanceBands]);

  // Calculate financials when tons or distance band changes
  useEffect(() => {
    if (watchTonsTransported > 0 && selectedDistanceBand) {
      const tons = parseFloat(watchTonsTransported);
      const rate = selectedDistanceBand.transport_rate_per_ton;
      const totalRevenue = tons * rate;
      const driverPayment = tons * selectedDistanceBand.driver_rate_per_ton;
      const sagibRetention = tons * selectedDistanceBand.sagib_retention_per_ton;

      setCalculations({
        total_revenue: totalRevenue,
        driver_payment: driverPayment,
        sagib_retention: sagibRetention,
      });
    } else {
      setCalculations({
        total_revenue: 0,
        driver_payment: 0,
        sagib_retention: 0,
      });
    }
  }, [watchTonsTransported, selectedDistanceBand]);

  const createMutation = useMutation({
    mutationFn: createTransportTrip,
    onSuccess: () => {
      toast.success('Transport trip created successfully');
      queryClient.invalidateQueries(['transport-trips']);
      onClose();
      reset();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to create transport trip');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => updateTransportTrip(id, data),
    onSuccess: () => {
      toast.success('Transport trip updated successfully');
      queryClient.invalidateQueries(['transport-trips']);
      onClose();
      reset();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update transport trip');
    }
  });

  const onSubmit = (data) => {
    const tons = parseFloat(data.tons_transported);
    const formattedData = {
      truck_id: parseInt(data.truck_id),
      driver_id: parseInt(data.driver_id),
      outgrower_id: parseInt(data.outgrower_id),
      weighbridge_id: parseInt(data.weighbridge_id),
      distance_band_id: parseInt(data.distance_band_id),
      trip_date: data.trip_date,
      tons_transported: tons,
      transport_rate: selectedDistanceBand?.transport_rate_per_ton,
      total_revenue: calculations.total_revenue,
      driver_payment: calculations.driver_payment,
      sagib_retention: calculations.sagib_retention,
      notes: data.notes,
    };

    if (trip) {
      updateMutation.mutate({ id: trip.id, data: formattedData });
    } else {
      createMutation.mutate(formattedData);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{trip ? 'Edit Transport Trip' : 'New Transport Trip'}</DialogTitle>
          <DialogDescription>
            {trip ? 'Update transport trip details' : 'Create a new transport trip'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="truck_id">Truck</Label>
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
                      {truck.plate_no} - {truck.model}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.truck_id && (
                <p className="text-red-500 text-sm mt-1">{errors.truck_id.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="driver_id">Driver</Label>
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

          <div>
            <Label htmlFor="outgrower_id">Outgrower</Label>
            <Select
              value={watch('outgrower_id')}
              onValueChange={(value) => setValue('outgrower_id', value)}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select outgrower" />
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
              <p><strong>Field:</strong> {selectedOutgrower.field_code}</p>
              <p><strong>Field Size:</strong> {selectedOutgrower.field_size_ha} ha</p>
              <p><strong>Distance Band:</strong> {selectedOutgrower.band_code || 'Auto-selected'}</p>
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
              <Label htmlFor="trip_date">Trip Date</Label>
              <Input
                id="trip_date"
                type="date"
                {...register('trip_date')}
                className="mt-1"
              />
              {errors.trip_date && (
                <p className="text-red-500 text-sm mt-1">{errors.trip_date.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="distance_band_id">Distance Band</Label>
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
              <Label htmlFor="tons_transported">Tons Transported</Label>
              <Input
                id="tons_transported"
                type="number"
                step="0.001"
                {...register('tons_transported', { valueAsNumber: true })}
                placeholder="Enter tons"
                className="mt-1"
              />
              {errors.tons_transported && (
                <p className="text-red-500 text-sm mt-1">{errors.tons_transported.message}</p>
              )}
            </div>
          </div>

          {selectedDistanceBand && watchTonsTransported > 0 && (
            <div className="bg-green-50 p-3 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Calculator className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-900">Financial Breakdown:</span>
              </div>
              <div className="space-y-1 text-sm">
                <p><strong>Transport Rate:</strong> {formatCurrency(selectedDistanceBand.transport_rate_per_ton)}/ton</p>
                <p><strong>Total Revenue:</strong> {formatCurrency(calculations.total_revenue)}</p>
                <p><strong>Driver Payment (40%):</strong> {formatCurrency(calculations.driver_payment)}</p>
                <p><strong>Sagib Retention (60%):</strong> {formatCurrency(calculations.sagib_retention)}</p>
              </div>
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
              {createMutation.isLoading || updateMutation.isLoading ? 'Saving...' : (trip ? 'Update' : 'Create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default TransportForm;
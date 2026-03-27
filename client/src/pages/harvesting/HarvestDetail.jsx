import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowLeft, CheckCircle, DollarSign, RefreshCw, AlertCircle } from 'lucide-react';
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
import { getHarvestAssignment, updateHarvestAssignment, computeHarvestFinancials } from '../../api/harvest';
import { formatCurrency, formatTons } from '../../utils/formatters';

const HarvestDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [actualTonnage, setActualTonnage] = useState('');
  const [status, setStatus] = useState('pending');
  const [notes, setNotes] = useState('');
  const [financials, setFinancials] = useState(null);
  const [isComputing, setIsComputing] = useState(false);
  const [error, setError] = useState(null);

  const { data: assignment, isLoading, refetch } = useQuery({
    queryKey: ['harvest-assignment', id],
    queryFn: () => getHarvestAssignment(id),
  });

  // Fetch financials if available
  const fetchFinancials = async () => {
    try {
      // Direct fetch to the financials endpoint
      const response = await fetch(`http://localhost:5000/api/harvest-financials?assignment_id=${id}`);
      const data = await response.json();
      if (data.success && data.data && data.data.length > 0) {
        setFinancials(data.data[0]);
      } else {
        setFinancials(null);
      }
    } catch (err) {
      console.error('Error fetching financials:', err);
    }
  };

  useEffect(() => {
    if (assignment?.data) {
      setActualTonnage(assignment.data.actual_tonnage || '');
      setStatus(assignment.data.status || 'pending');
      setNotes(assignment.data.notes || '');
      fetchFinancials();
    }
  }, [assignment]);

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => updateHarvestAssignment(id, data),
    onSuccess: async (response) => {
      toast.success('Harvest assignment updated successfully');
      await refetch();
      
      // After successful update, if status is completed and we have actual tonnage, compute financials
      if (status === 'completed' && actualTonnage && parseFloat(actualTonnage) > 0) {
        // Wait a moment for the update to fully complete
        setTimeout(() => {
          handleComputeFinancials();
        }, 500);
      }
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update harvest assignment');
      setError(error.message);
    }
  });

  const handleComputeFinancials = async () => {
    // Double-check we have actual tonnage
    const currentActualTonnage = actualTonnage || assignment?.data?.actual_tonnage;
    
    if (!currentActualTonnage || parseFloat(currentActualTonnage) <= 0) {
      toast.error('Please enter actual tonnage first');
      setError('Cannot compute financials without actual tonnage. Please enter the actual harvested tons.');
      return;
    }
    
    try {
      setIsComputing(true);
      setError(null);
      
      // First make sure the assignment has the actual tonnage saved
      if (!assignment?.data?.actual_tonnage && currentActualTonnage) {
        // Save the actual tonnage first
        const updateData = {
          ...assignment.data,
          actual_tonnage: parseFloat(currentActualTonnage),
          status: status,
          notes: notes,
        };
        await updateAssignment(updateData);
      }
      
      // Now compute financials
      const response = await computeHarvestFinancials(id);
      toast.success('Financials computed successfully');
      
      // Fetch the computed financials
      await fetchFinancials();
      await refetch();
    } catch (error) {
      console.error('Compute error:', error);
      const errorMsg = error.message || 'Failed to compute financials. Please check if rate configuration exists.';
      toast.error(errorMsg);
      setError(errorMsg);
    } finally {
      setIsComputing(false);
    }
  };

  const updateAssignment = async (updateData) => {
    return new Promise((resolve, reject) => {
      updateMutation.mutate({ id, data: updateData }, {
        onSuccess: resolve,
        onError: reject
      });
    });
  };

  const handleSave = () => {
    if (status === 'completed' && (!actualTonnage || parseFloat(actualTonnage) <= 0)) {
      toast.error('Please enter actual tonnage before marking as completed');
      return;
    }
    
    const updateData = {
      ...assignment.data,
      actual_tonnage: actualTonnage ? parseFloat(actualTonnage) : null,
      status: status,
      notes: notes,
    };
    updateMutation.mutate({ id, data: updateData });
  };

  const handleComplete = async () => {
    if (!actualTonnage || parseFloat(actualTonnage) <= 0) {
      toast.error('Please enter actual tonnage before completing');
      return;
    }
    
    // First update the assignment with actual tonnage and completed status
    const updateData = {
      ...assignment.data,
      actual_tonnage: parseFloat(actualTonnage),
      status: 'completed',
      notes: notes,
    };
    
    try {
      setIsComputing(true);
      // Update the assignment
      await updateAssignment(updateData);
      setStatus('completed');
      
      // Wait a moment for the update to process
      setTimeout(async () => {
        // Now compute financials
        try {
          await computeHarvestFinancials(id);
          toast.success('Assignment completed and financials computed!');
          await fetchFinancials();
          await refetch();
        } catch (computeError) {
          console.error('Compute error after completion:', computeError);
          toast.warning('Assignment completed but financials need to be computed manually. Click "Compute Financials" button.');
          setError('Financials not computed automatically. Please click "Compute Financials" button.');
        } finally {
          setIsComputing(false);
        }
      }, 1000);
    } catch (error) {
      toast.error(error.message || 'Failed to complete assignment');
      setIsComputing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  const harvest = assignment?.data;

  if (!harvest) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-gray-900">Harvest assignment not found</h2>
        <Button onClick={() => navigate('/harvesting')} className="mt-4">
          Back to List
        </Button>
      </div>
    );
  }

  const isCompleted = status === 'completed';
  const tonnageDiff = harvest.actual_tonnage ? harvest.actual_tonnage - harvest.expected_tonnage : null;
  const hasFinancials = financials !== null;
  const currentActualTonnage = actualTonnage || harvest.actual_tonnage;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => navigate('/harvesting')}
            className="p-2"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold text-gray-900">
            Harvest Assignment #{harvest.id}
          </h1>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={handleSave}
            disabled={updateMutation.isLoading}
          >
            Save Changes
          </Button>
          {!isCompleted && (
            <Button
              onClick={handleComplete}
              disabled={!actualTonnage || updateMutation.isLoading || isComputing}
              className="bg-green-600 hover:bg-green-700"
            >
              {isComputing ? 'Processing...' : <><CheckCircle className="h-4 w-4 mr-2" /> Record & Complete</>}
            </Button>
          )}
          {isCompleted && !hasFinancials && (
            <Button
              onClick={handleComputeFinancials}
              disabled={isComputing || !currentActualTonnage}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isComputing ? 'animate-spin' : ''}`} />
              Compute Financials
            </Button>
          )}
        </div>
      </div>

      {/* Status Badge */}
      <div className="flex items-center gap-3">
        <span className={`px-3 py-1 text-sm font-semibold rounded-full ${
          status === 'completed' ? 'bg-green-100 text-green-800' :
          status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
          status === 'cancelled' ? 'bg-red-100 text-red-800' :
          'bg-yellow-100 text-yellow-800'
        }`}>
          {status.toUpperCase()}
        </span>
        {hasFinancials && (
          <span className="text-sm text-green-600 flex items-center gap-1">
            <CheckCircle className="h-4 w-4" />
            Financials Computed
          </span>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
          <div>
            <p className="text-red-800 font-medium">Error</p>
            <p className="text-red-600 text-sm mt-1">{error}</p>
            {error.includes('actual tonnage') && (
              <p className="text-red-500 text-xs mt-2">
                Please enter the actual tonnage harvested in the field below.
              </p>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Assignment Details */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Assignment Details</h2>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <p className="text-sm text-gray-500">Headman:</p>
              <p className="text-sm font-medium">{harvest.headman_name || 'Not assigned'}</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <p className="text-sm text-gray-500">Outgrower:</p>
              <p className="text-sm font-medium">{harvest.outgrower_name || 'Not assigned'}</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <p className="text-sm text-gray-500">Field Code:</p>
              <p className="text-sm font-medium">{harvest.field_code || 'N/A'}</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <p className="text-sm text-gray-500">Assignment Date:</p>
              <p className="text-sm font-medium">{new Date(harvest.assignment_date).toLocaleDateString()}</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <p className="text-sm text-gray-500">Turnup:</p>
              <p className="text-sm font-medium">{harvest.turnup} bundles</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <p className="text-sm text-gray-500">Expected Tonnage:</p>
              <p className="text-sm font-medium">{formatTons(harvest.expected_tonnage)}</p>
            </div>
          </div>
        </div>

        {/* Process Assignment */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Process Assignment</h2>
          <div className="space-y-4">
            <div>
              <Label htmlFor="actual_tonnage">Actual Tonnage (Tons)</Label>
              <Input
                id="actual_tonnage"
                type="number"
                step="0.001"
                value={actualTonnage}
                onChange={(e) => setActualTonnage(e.target.value)}
                placeholder="Enter actual harvested tons"
                className="mt-1"
                disabled={isCompleted}
              />
              {tonnageDiff !== null && (
                <p className={`text-sm mt-1 ${tonnageDiff >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {tonnageDiff >= 0 ? '↑' : '↓'} Difference: {formatTons(Math.abs(tonnageDiff))}
                </p>
              )}
              {(!actualTonnage || parseFloat(actualTonnage) <= 0) && !isCompleted && (
                <p className="text-amber-600 text-xs mt-1">
                  ⚠️ Required: Enter actual tonnage to complete this assignment
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={status} onValueChange={setStatus} disabled={isCompleted}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Enter any notes"
                rows={3}
                className="mt-1"
              />
            </div>

            {/* Hint for financials */}
            {isCompleted && !hasFinancials && currentActualTonnage && (
              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-blue-800 text-sm flex items-center gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Click "Compute Financials" to calculate the financial breakdown
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Financial Breakdown */}
      {hasFinancials && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-2 mb-4">
            <DollarSign className="h-5 w-5 text-green-600" />
            <h2 className="text-lg font-semibold text-gray-900">Financial Breakdown</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-sm text-gray-500">Factory Revenue (Cutters)</p>
              <p className="text-lg font-bold text-gray-900">{formatCurrency(financials.factory_revenue_cutters)}</p>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-sm text-gray-500">Factory Revenue (Tonnage)</p>
              <p className="text-lg font-bold text-gray-900">{formatCurrency(financials.factory_revenue_tonnage)}</p>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-sm text-gray-500">Total Factory Revenue</p>
              <p className="text-lg font-bold text-green-600">{formatCurrency(financials.total_factory_revenue)}</p>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-sm text-gray-500">Cutter Payment</p>
              <p className="text-lg font-bold text-gray-900">{formatCurrency(financials.cutter_payment)}</p>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-sm text-gray-500">Transaction Costs</p>
              <p className="text-lg font-bold text-gray-900">{formatCurrency(financials.transaction_costs)}</p>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-sm text-gray-500">Gross Profit</p>
              <p className="text-lg font-bold text-gray-900">{formatCurrency(financials.gross_profit)}</p>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-sm text-gray-500">Headman Commission (40%)</p>
              <p className="text-lg font-bold text-blue-600">{formatCurrency(financials.headman_commission)}</p>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-sm text-gray-500">Sagib Commission (60%)</p>
              <p className="text-lg font-bold text-primary">{formatCurrency(financials.sagib_commission)}</p>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-sm text-gray-500">Headman Harvest Share</p>
              <p className="text-lg font-bold text-blue-600">{formatCurrency(financials.headman_harvest_share)}</p>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-sm text-gray-500">Sagib Net</p>
              <p className="text-lg font-bold text-primary">{formatCurrency(financials.sagib_net_harvest)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Instructions when no financials yet */}
      {isCompleted && !hasFinancials && currentActualTonnage && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
            <div>
              <p className="text-yellow-800 font-medium">Financials Not Yet Computed</p>
              <p className="text-yellow-700 text-sm mt-1">
                Click the "Compute Financials" button above to calculate the financial breakdown.
                Make sure you have set up rate configurations in Setup → Rate Configuration.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Instructions for pending assignments */}
      {!isCompleted && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-blue-800 text-sm">
            📝 To complete this assignment and compute financials:
          </p>
          <ol className="text-blue-700 text-sm mt-2 list-decimal list-inside space-y-1">
            <li>Enter the <strong>Actual Tonnage</strong> harvested</li>
            <li>Click <strong>"Record & Complete"</strong> button</li>
            <li>Financials will be automatically computed</li>
          </ol>
        </div>
      )}
    </div>
  );
};

export default HarvestDetail;
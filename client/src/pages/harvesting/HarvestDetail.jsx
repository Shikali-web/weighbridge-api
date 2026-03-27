import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowLeft, CheckCircle, DollarSign, RefreshCw, AlertCircle, Truck, Scale, User, Calendar, MapPin } from 'lucide-react';
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
import { getLoadingRecords } from '../../api/loading';
import { formatCurrency, formatTons } from '../../utils/formatters';
import DataTable from '../../components/shared/DataTable';

const HarvestDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [turnup, setTurnup] = useState('');
  const [status, setStatus] = useState('pending');
  const [notes, setNotes] = useState('');
  const [financials, setFinancials] = useState(null);
  const [isComputing, setIsComputing] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [error, setError] = useState(null);
  const [loadingRecords, setLoadingRecords] = useState([]);

  const { data: assignment, isLoading, refetch } = useQuery({
    queryKey: ['harvest-assignment', id],
    queryFn: () => getHarvestAssignment(id),
  });

  // Fetch loading records for this assignment
  const fetchLoadingRecords = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/loading-records?assignment_id=${id}`);
      const data = await response.json();
      if (data.success) {
        setLoadingRecords(data.data);
      }
    } catch (err) {
      console.error('Error fetching loading records:', err);
    }
  };

  // Fetch financials
  const fetchFinancials = async () => {
    try {
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
      setTurnup(assignment.data.turnup || '');
      setStatus(assignment.data.status || 'pending');
      setNotes(assignment.data.notes || '');
      fetchLoadingRecords();
      fetchFinancials();
    }
  }, [assignment]);

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => updateHarvestAssignment(id, data),
    onSuccess: async (response) => {
      toast.success('Harvest assignment updated successfully');
      await refetch();
      await fetchLoadingRecords();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update harvest assignment');
      setError(error.message);
    }
  });

  const handleComputeFinancials = async () => {
    const actualTonnage = assignment?.data?.actual_tonnage || 0;
    
    if (actualTonnage <= 0) {
      toast.error('No loads recorded yet. Please add loads before computing financials.');
      return;
    }
    
    try {
      setIsComputing(true);
      setError(null);
      const response = await computeHarvestFinancials(id);
      toast.success('Financials computed successfully');
      await fetchFinancials();
    } catch (error) {
      console.error('Compute error:', error);
      const errorMsg = error.message || 'Failed to compute financials. Please check if rate configuration exists.';
      toast.error(errorMsg);
      setError(errorMsg);
    } finally {
      setIsComputing(false);
    }
  };

  const handleMarkComplete = async () => {
    const actualTonnage = assignment?.data?.actual_tonnage || 0;
    
    if (actualTonnage <= 0) {
      toast.error('Cannot mark as complete without any loads recorded. Please add loads first.');
      return;
    }
    
    try {
      setIsCompleting(true);
      const response = await fetch(`http://localhost:5000/api/harvest-assignments/${id}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await response.json();
      if (data.success) {
        toast.success('Field marked as complete! Harvest assignment is now finalized.');
        await refetch();
        await fetchFinancials();
      } else {
        toast.error(data.message || 'Failed to mark as complete');
      }
    } catch (error) {
      console.error('Complete error:', error);
      toast.error(error.message || 'Failed to mark as complete');
    } finally {
      setIsCompleting(false);
    }
  };

  const handleSave = () => {
    const updateData = {
      ...assignment.data,
      turnup: parseFloat(turnup),
      status: status,
      notes: notes,
    };
    updateMutation.mutate({ id, data: updateData });
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

  const isCompleted = harvest.manually_completed === true;
  const actualTonnage = parseFloat(harvest.actual_tonnage) || 0;
  const expectedTonnage = parseFloat(harvest.expected_tonnage);
  const remainingTonnage = expectedTonnage - actualTonnage;
  const percentComplete = (actualTonnage / expectedTonnage) * 100;
  const hasFinancials = financials !== null;
  const canComputeFinancials = actualTonnage > 0 && !hasFinancials;
  const canMarkComplete = actualTonnage > 0 && !isCompleted;

  // Loading records table columns
  const loadingColumns = [
    { key: "load_date", label: "Date", render: (value) => new Date(value).toLocaleDateString() },
    { key: "tons_loaded", label: "Tons Loaded", render: (value) => formatTons(value) },
    { key: "weighbridge_name", label: "Weighbridge" },
    { key: "supervisor_name", label: "Supervisor" },
    { key: "trip_count", label: "Trips" },
    { key: "notes", label: "Notes" },
  ];

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
            disabled={updateMutation.isLoading || isCompleted}
          >
            Save Changes
          </Button>
          {canComputeFinancials && (
            <Button
              onClick={handleComputeFinancials}
              disabled={isComputing}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isComputing ? 'animate-spin' : ''}`} />
              Compute Financials
            </Button>
          )}
          {canMarkComplete && (
            <Button
              onClick={handleMarkComplete}
              disabled={isCompleting || actualTonnage <= 0}
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              {isCompleting ? 'Processing...' : 'Mark Field as Complete'}
            </Button>
          )}
        </div>
      </div>

      {/* Status Badge */}
      <div className="flex items-center gap-3">
        <span className={`px-3 py-1 text-sm font-semibold rounded-full ${
          isCompleted ? 'bg-green-100 text-green-800' :
          status === 'cancelled' ? 'bg-red-100 text-red-800' :
          actualTonnage > 0 ? 'bg-blue-100 text-blue-800' :
          'bg-yellow-100 text-yellow-800'
        }`}>
          {isCompleted ? 'COMPLETED' : 
           status === 'cancelled' ? 'CANCELLED' :
           actualTonnage > 0 ? 'IN PROGRESS' : 
           'PENDING'}
        </span>
        {hasFinancials && (
          <span className="text-sm text-green-600 flex items-center gap-1">
            <CheckCircle className="h-4 w-4" />
            Financials Computed
          </span>
        )}
        {isCompleted && (
          <span className="text-sm text-green-600 flex items-center gap-1">
            <CheckCircle className="h-4 w-4" />
            Field Fully Harvested
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
              <p className="text-sm text-gray-500">Field Size:</p>
              <p className="text-sm font-medium">{harvest.field_size_ha || 'N/A'} ha</p>
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

        {/* Loading Progress */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Loading Progress</h2>
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Expected Tonnage:</span>
                <span className="font-medium">{formatTons(expectedTonnage)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Loaded Tonnage:</span>
                <span className="font-medium text-green-600">{formatTons(actualTonnage)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Remaining:</span>
                <span className={`font-medium ${remainingTonnage > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                  {remainingTonnage > 0 ? formatTons(remainingTonnage) : 'None'}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 mt-2">
                <div 
                  className="bg-primary h-3 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(percentComplete, 100)}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 text-center mt-2">
                {percentComplete.toFixed(1)}% Complete
              </p>
            </div>

            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Truck className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Load Summary</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-gray-500">Total Loads:</p>
                  <p className="font-medium">{loadingRecords.length}</p>
                </div>
                <div>
                  <p className="text-gray-500">Average Load:</p>
                  <p className="font-medium">{loadingRecords.length > 0 ? formatTons(actualTonnage / loadingRecords.length) : formatTons(0)}</p>
                </div>
              </div>
            </div>

            {!isCompleted && actualTonnage > 0 && (
              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-blue-800 text-sm">
                  ⚠️ The field has {formatTons(remainingTonnage)} remaining. Click "Mark Field as Complete" when all cane is harvested.
                </p>
              </div>
            )}

            {isCompleted && (
              <div className="bg-green-50 p-3 rounded-lg">
                <p className="text-green-800 text-sm flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  This field has been marked as fully harvested. No more loads can be added.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Edit Assignment</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="turnup">Turnup (Cane bundles)</Label>
            <Input
              id="turnup"
              type="number"
              step="0.1"
              value={turnup}
              onChange={(e) => setTurnup(e.target.value)}
              className="mt-1"
              disabled={isCompleted}
            />
            <p className="text-xs text-gray-500 mt-1">Expected: {formatTons(turnup * 2.25)}</p>
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
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="md:col-span-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Enter any notes"
              rows={3}
              className="mt-1"
              disabled={isCompleted}
            />
          </div>
        </div>
      </div>

      {/* Loading Records Table */}
      {loadingRecords.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-2 mb-4">
            <Truck className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-gray-900">Loading Records</h2>
          </div>
          <DataTable
            columns={loadingColumns}
            data={loadingRecords}
            loading={false}
            emptyMessage="No loads recorded yet"
          />
        </div>
      )}

      {/* Financial Breakdown */}
      {hasFinancials && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-2 mb-4">
            <DollarSign className="h-5 w-5 text-green-600" />
            <h2 className="text-lg font-semibold text-gray-900">Financial Breakdown</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-sm text-gray-500">Factory Revenue</p>
              <p className="text-lg font-bold text-gray-900">{formatCurrency(financials.factory_revenue)}</p>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-sm text-gray-500">Cutter Payment</p>
              <p className="text-lg font-bold text-gray-900">{formatCurrency(financials.cutter_payment)}</p>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-sm text-gray-500">Gross Profit</p>
              <p className="text-lg font-bold text-green-600">{formatCurrency(financials.gross_profit)}</p>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-sm text-gray-500">Headman Share (40%)</p>
              <p className="text-lg font-bold text-blue-600">{formatCurrency(financials.final_headman_payment)}</p>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-sm text-gray-500">Sagib Net (60%)</p>
              <p className="text-lg font-bold text-primary">{formatCurrency(financials.final_sagib_net)}</p>
            </div>
            {financials.performance_adjustment !== 0 && (
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-sm text-gray-500">Performance Adjustment</p>
                <p className={`text-lg font-bold ${financials.performance_adjustment > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(financials.performance_adjustment)}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Instructions */}
      {!isCompleted && actualTonnage === 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-blue-800 text-sm">
            📝 To complete this harvest assignment:
          </p>
          <ol className="text-blue-700 text-sm mt-2 list-decimal list-inside space-y-1">
            <li>Record loads from the field using the "Loading & Transport" page</li>
            <li>Each load will update the loaded tonnage automatically</li>
            <li>When all cane is harvested, click "Mark Field as Complete"</li>
            <li>Then click "Compute Financials" to calculate the financial breakdown</li>
          </ol>
        </div>
      )}

      {!isCompleted && actualTonnage > 0 && !hasFinancials && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800 text-sm">
            ⚠️ {formatTons(remainingTonnage)} remaining to be loaded. 
            Mark the field as complete when all cane is harvested, then compute financials.
          </p>
        </div>
      )}

      {isCompleted && !hasFinancials && actualTonnage > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-blue-800 text-sm">
            ✅ Field is marked as complete. Click "Compute Financials" to calculate the financial breakdown.
          </p>
        </div>
      )}
    </div>
  );
};

export default HarvestDetail;
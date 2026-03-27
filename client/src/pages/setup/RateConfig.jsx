import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Save, Edit2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { getRateConfig, updateRateConfig, createRateConfig } from '../../api/setup';
import { formatCurrency } from '../../utils/formatters';

const RateConfig = () => {
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [newConfig, setNewConfig] = useState({ config_key: '', config_value: '', description: '' });
  const [showAddForm, setShowAddForm] = useState(false);
  const queryClient = useQueryClient();

  const { data: configs, isLoading } = useQuery({
    queryKey: ['rate-config'],
    queryFn: () => getRateConfig()
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => updateRateConfig(id, data),
    onSuccess: () => {
      toast.success('Rate configuration updated successfully');
      queryClient.invalidateQueries(['rate-config']);
      setEditingId(null);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update rate configuration');
    }
  });

  const createMutation = useMutation({
    mutationFn: createRateConfig,
    onSuccess: () => {
      toast.success('Rate configuration created successfully');
      queryClient.invalidateQueries(['rate-config']);
      setShowAddForm(false);
      setNewConfig({ config_key: '', config_value: '', description: '' });
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to create rate configuration');
    }
  });

  const handleEdit = (config) => {
    setEditingId(config.id);
    setEditValue(config.config_value);
  };

  const handleSave = (id) => {
    updateMutation.mutate({ id, data: { config_value: parseFloat(editValue) } });
  };

  const handleCreate = () => {
    if (!newConfig.config_key || !newConfig.config_value) {
      toast.error('Please fill in all required fields');
      return;
    }
    createMutation.mutate({
      config_key: newConfig.config_key,
      config_value: parseFloat(newConfig.config_value),
      description: newConfig.description,
      effective_from: new Date().toISOString().split('T')[0]
    });
  };

  const configDescriptions = {
    'factory_rate_cutters': 'Rate per cane bundle for cutters (KES)',
    'factory_rate_tonnage': 'Rate per ton for harvested cane (KES/ton)',
    'transaction_costs': 'Transaction costs per assignment (KES)',
  };

  const configItems = configs?.data || [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Rate Configuration</h2>
        <Button onClick={() => setShowAddForm(!showAddForm)} className="bg-primary text-white">
          {showAddForm ? 'Cancel' : 'Add New Rate'}
        </Button>
      </div>

      {/* Add New Rate Form */}
      {showAddForm && (
        <div className="bg-white rounded-lg shadow p-6 border-2 border-primary">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New Rate Configuration</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="config_key">Config Key</Label>
              <Input
                id="config_key"
                value={newConfig.config_key}
                onChange={(e) => setNewConfig({ ...newConfig, config_key: e.target.value })}
                placeholder="e.g., loading_rate"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="config_value">Value (KES)</Label>
              <Input
                id="config_value"
                type="number"
                step="0.01"
                value={newConfig.config_value}
                onChange={(e) => setNewConfig({ ...newConfig, config_value: e.target.value })}
                placeholder="Enter rate value"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={newConfig.description}
                onChange={(e) => setNewConfig({ ...newConfig, description: e.target.value })}
                placeholder="Brief description"
                className="mt-1"
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <Button onClick={handleCreate} className="bg-green-600 text-white" disabled={createMutation.isLoading}>
              {createMutation.isLoading ? 'Creating...' : 'Create Rate'}
            </Button>
          </div>
        </div>
      )}

      {/* Existing Rates Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {configItems.map((config) => (
          <div key={config.id} className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-3">
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 text-lg">{config.config_key.replace(/_/g, ' ').toUpperCase()}</h3>
                <p className="text-sm text-gray-500 mt-1">
                  {configDescriptions[config.config_key] || config.description || 'Rate configuration'}
                </p>
              </div>
              {editingId === config.id ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSave(config.id)}
                  disabled={updateMutation.isLoading}
                  className="text-green-600"
                >
                  <Save className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEdit(config)}
                  className="text-primary"
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
              )}
            </div>
            
            <div className="mt-4">
              {editingId === config.id ? (
                <Input
                  type="number"
                  step="0.01"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="w-full text-2xl font-bold"
                />
              ) : (
                <div className="text-3xl font-bold text-primary">
                  {formatCurrency(config.config_value)}
                </div>
              )}
            </div>
            
            <div className="mt-3 pt-3 border-t border-gray-100">
              <p className="text-xs text-gray-400">
                Effective from: {new Date(config.effective_from).toLocaleDateString()}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {configItems.length === 0 && !isLoading && (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-gray-500 mb-4">No rate configurations found</p>
          <Button onClick={() => setShowAddForm(true)} className="bg-primary text-white">
            Add Your First Rate
          </Button>
        </div>
      )}

      {/* Default Rates Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-semibold text-blue-900 mb-2">Default Rates (if not configured):</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Factory Rate (Cutters): 500 KES per bundle</li>
          <li>• Factory Rate (Tonnage): 1000 KES per ton</li>
          <li>• Transaction Costs: 50 KES per assignment</li>
        </ul>
        <p className="text-xs text-blue-600 mt-2">
          Configure custom rates above to override defaults.
        </p>
      </div>
    </div>
  );
};

export default RateConfig;
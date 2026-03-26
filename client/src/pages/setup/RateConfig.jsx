import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Save, Edit2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../../components/ui/button';
import { getRateConfig, updateRateConfig } from '../../api/setup';
import { formatCurrency } from '../../utils/formatters';

const RateConfig = () => {
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');
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

  const handleEdit = (config) => {
    setEditingId(config.id);
    setEditValue(config.config_value);
  };

  const handleSave = (id) => {
    updateMutation.mutate({ id, data: { config_value: parseFloat(editValue) } });
  };

  const configItems = configs?.data || [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Rate Configuration</h2>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6">
          {configItems.map((config) => (
            <div key={config.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-semibold text-gray-900">{config.config_name}</h3>
                  <p className="text-sm text-gray-500 mt-1">{config.description}</p>
                </div>
                {editingId === config.id ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSave(config.id)}
                    disabled={updateMutation.isLoading}
                  >
                    <Save className="h-4 w-4 text-green-600" />
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(config)}
                  >
                    <Edit2 className="h-4 w-4 text-primary" />
                  </Button>
                )}
              </div>
              
              <div className="mt-2">
                {editingId === config.id ? (
                  <input
                    type="number"
                    step="0.01"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                ) : (
                  <div className="text-2xl font-bold text-primary">
                    {formatCurrency(config.config_value)}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default RateConfig;
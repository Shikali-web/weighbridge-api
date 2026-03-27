import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, Loader2 } from 'lucide-react';
import { Button } from '../../components/ui/button';
import WeekPicker from '../../components/shared/WeekPicker';
import { getISOWeek } from '../../utils/formatters';

const HeadmanPerformanceTest = () => {
  const navigate = useNavigate();
  const currentDate = new Date();
  const [week, setWeek] = useState(getISOWeek(currentDate));
  const [year, setYear] = useState(currentDate.getFullYear());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [apiResponse, setApiResponse] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`http://localhost:5000/api/reports/headman-performance?week=${week}&year=${year}`);
      const result = await response.json();
      console.log('API Response:', result);
      setApiResponse(result);
      if (result.success) {
        setData(result.data);
      } else {
        setError(result.message || 'Failed to load data');
      }
    } catch (err) {
      console.error('Fetch error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [week, year]);

  const handleWeekChange = (newWeek, newYear) => {
    setWeek(newWeek);
    setYear(newYear);
  };

  const handleGoBack = () => {
    navigate('/reports');
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={handleGoBack} className="p-2">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Headman Performance - Test Page</h2>
            <p className="text-sm text-gray-500 mt-1">Debugging: Check API response and data</p>
          </div>
        </div>
        <Button onClick={fetchData} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <WeekPicker week={week} year={year} onChange={handleWeekChange} />

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2 text-gray-500">Loading...</span>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h3 className="text-red-800 font-semibold mb-2">Error:</h3>
          <p className="text-red-600">{error}</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* API Response Debug */}
          <div className="bg-gray-100 rounded-lg p-4">
            <h3 className="font-semibold mb-2">API Response:</h3>
            <pre className="text-xs overflow-auto max-h-40 bg-gray-800 text-white p-2 rounded">
              {JSON.stringify(apiResponse, null, 2)}
            </pre>
          </div>

          {/* Data Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="p-4 bg-gray-50 border-b">
              <h3 className="font-semibold">Data ({data?.length || 0} records):</h3>
            </div>
            {data && data.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Headman</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expected Tons</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actual Tons</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Performance %</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Weekly Pay</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {data.map((item, idx) => (
                      <tr key={idx}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.headman_name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.expected_tons?.toFixed(3)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.actual_tons?.toFixed(3)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.performance_percentage?.toFixed(1)}%</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">KES {item.weekly_pay?.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center text-gray-500">
                No data found for week {week}, {year}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default HeadmanPerformanceTest;
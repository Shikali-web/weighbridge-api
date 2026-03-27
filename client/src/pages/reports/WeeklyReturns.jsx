import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import WeekPicker from '../../components/shared/WeekPicker';
import StatCard from '../../components/shared/StatCard';
import DataTable from '../../components/shared/DataTable';
import EmptyState from '../../components/shared/EmptyState';
import { getWeeklyReturns, getCompanySummary } from '../../api/reports';
import { formatCurrency, formatTons, getISOWeek, getWeekDates } from '../../utils/formatters';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from 'recharts';

const WeeklyReturns = () => {
  const currentDate = new Date();
  const [week, setWeek] = useState(getISOWeek(currentDate));
  const [year, setYear] = useState(currentDate.getFullYear());
  const [trendData, setTrendData] = useState([]);
  const [isLoadingTrend, setIsLoadingTrend] = useState(false);

  const { data: returns, isLoading } = useQuery({
    queryKey: ['weekly-returns', week, year],
    queryFn: () => getWeeklyReturns(week, year),
    enabled: true,
  });

  // Fetch last 8 weeks of data for trend
  useEffect(() => {
    const fetchTrendData = async () => {
      setIsLoadingTrend(true);
      const data = [];
      for (let i = 7; i >= 0; i--) {
        let targetWeek = week - i;
        let targetYear = year;
        if (targetWeek < 1) {
          targetWeek = 52 + targetWeek;
          targetYear--;
        }
        try {
          const response = await getWeeklyReturns(targetWeek, targetYear);
          if (response?.data) {
            data.push({
              week: `W${targetWeek}`,
              year: targetYear,
              sagibNet: response.data.total_sagib_net || 0,
              revenue: response.data.total_revenue || 0,
              costs: response.data.total_costs || 0,
              tons: response.data.total_actual_tons || 0
            });
          }
        } catch (err) {
          console.error('Error fetching trend data:', err);
        }
      }
      setTrendData(data);
      setIsLoadingTrend(false);
    };
    fetchTrendData();
  }, [week, year]);

  const handleWeekChange = (newWeek, newYear) => {
    setWeek(newWeek);
    setYear(newYear);
  };

  const reportData = returns?.data || {};
  const weekDates = getWeekDates(week, year);

  const stats = [
    { 
      label: "Harvest Revenue", 
      value: formatCurrency(reportData.harvest_revenue || 0),
      subValue: `${formatTons(reportData.total_actual_tons || 0)} tons harvested`,
      color: "green"
    },
    { 
      label: "Loading Revenue", 
      value: formatCurrency(reportData.loading_revenue || 0),
      subValue: `${formatTons(reportData.loading_total_tons || 0)} tons loaded`,
      color: "blue"
    },
    { 
      label: "Transport Revenue", 
      value: formatCurrency(reportData.transport_revenue || 0),
      subValue: `${reportData.transport_total_trips || 0} trips`,
      color: "amber"
    },
    { 
      label: "Total Sagib Net", 
      value: formatCurrency(reportData.total_sagib_net || 0),
      subValue: `${((reportData.total_sagib_net || 0) / (reportData.total_revenue || 1) * 100).toFixed(1)}% margin`,
      color: "green"
    }
  ];

  const breakdownData = [
    { 
      service: "Harvesting", 
      revenue: reportData.harvest_revenue || 0,
      costs: reportData.harvest_costs || 0,
      gross_profit: reportData.harvest_gross_profit || 0,
      sagib_net: reportData.harvest_sagib_net || 0
    },
    { 
      service: "Loading", 
      revenue: reportData.loading_revenue || 0,
      costs: reportData.loading_costs || 0,
      gross_profit: reportData.loading_gross_profit || 0,
      sagib_net: reportData.loading_sagib_net || 0
    },
    { 
      service: "Transport", 
      revenue: reportData.transport_revenue || 0,
      costs: reportData.transport_costs || 0,
      gross_profit: (reportData.transport_revenue || 0) - (reportData.transport_costs || 0),
      sagib_net: reportData.transport_sagib_net || 0
    },
    { 
      service: "TOTAL", 
      revenue: reportData.total_revenue || 0,
      costs: reportData.total_costs || 0,
      gross_profit: (reportData.total_revenue || 0) - (reportData.total_costs || 0),
      sagib_net: reportData.total_sagib_net || 0
    }
  ];

  const breakdownColumns = [
    { key: "service", label: "Service" },
    { key: "revenue", label: "Revenue", render: (v) => formatCurrency(v) },
    { key: "costs", label: "Costs", render: (v) => formatCurrency(v) },
    { key: "gross_profit", label: "Gross Profit", render: (v) => formatCurrency(v) },
    { key: "sagib_net", label: "Sagib Net", render: (v) => formatCurrency(v) }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Weekly Returns</h2>
          <p className="text-sm text-gray-500 mt-1">Week {week} • {weekDates.formatted}</p>
        </div>
      </div>

      <WeekPicker week={week} year={year} onChange={handleWeekChange} />

      {!isLoading && !reportData.total_revenue ? (
        <EmptyState 
          title="No Data Available"
          subtitle={`No returns found for week ${week}, ${year}`}
        />
      ) : (
        <>
          {/* Stat Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((stat, index) => (
              <StatCard
                key={index}
                label={stat.label}
                value={stat.value}
                subValue={stat.subValue}
                color={stat.color}
              />
            ))}
          </div>

          {/* Trend Chart - Last 8 Weeks */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">8-Week Trend - Sagib Net Revenue</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="colorSagib" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4caf7d" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#4caf7d" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="week" />
                  <YAxis tickFormatter={(value) => `KES ${(value / 1000).toFixed(0)}K`} />
                  <Tooltip 
                    formatter={(value) => formatCurrency(value)}
                    labelFormatter={(label) => `${label}, ${trendData.find(d => d.week === label)?.year || ''}`}
                  />
                  <Legend />
                  <Area 
                    type="monotone" 
                    dataKey="sagibNet" 
                    stroke="#4caf7d" 
                    fillOpacity={1} 
                    fill="url(#colorSagib)" 
                    name="Sagib Net"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="#3b82f6" 
                    name="Total Revenue"
                    strokeDasharray="5 5"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <p className="text-xs text-gray-500 text-center mt-2">
              Last 8 weeks trend showing Sagib Net Revenue (filled area) and Total Revenue (dashed line)
            </p>
          </div>

          {/* Service Breakdown Table */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Service Breakdown</h3>
            <DataTable
              columns={breakdownColumns}
              data={breakdownData}
              loading={isLoading}
              emptyMessage="No data available"
            />
          </div>

          {/* Tonnage Summary */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Tonnage Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Expected Tons</p>
                <p className="text-2xl font-bold text-gray-900">{formatTons(reportData.total_expected_tons || 0)}</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Actual Tons</p>
                <p className="text-2xl font-bold text-green-600">{formatTons(reportData.total_actual_tons || 0)}</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Variance</p>
                <p className={`text-2xl font-bold ${(reportData.total_actual_tons || 0) >= (reportData.total_expected_tons || 0) ? 'text-green-600' : 'text-red-600'}`}>
                  {((reportData.total_actual_tons || 0) - (reportData.total_expected_tons || 0)) >= 0 ? '+' : ''}
                  {formatTons((reportData.total_actual_tons || 0) - (reportData.total_expected_tons || 0))}
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default WeeklyReturns;
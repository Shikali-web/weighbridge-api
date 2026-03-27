import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  DollarSign, Truck, Scale, TrendingUp, Users, Package, 
  Calendar, ArrowUp, ArrowDown, BarChart3, PieChart 
} from 'lucide-react';
import { getCompanySummary, getWeeklyReturns } from '../api/reports';
import { getHarvestAssignments } from '../api/harvest';
import { getLoadingRecords } from '../api/loading';
import { getTransportTrips } from '../api/transport';
import StatCard from '../components/shared/StatCard';
import DataTable from '../components/shared/DataTable';
import { formatCurrency, formatTons, getWeekDates, getISOWeek } from '../utils/formatters';

const Dashboard = () => {
  const currentDate = new Date();
  const currentWeek = getISOWeek(currentDate);
  const currentYear = currentDate.getFullYear();
  const weekDates = getWeekDates(currentWeek, currentYear);
  
  // Fetch company summary for current week
  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['company-summary', currentWeek, currentYear],
    queryFn: () => getCompanySummary(currentWeek, currentYear),
    refetchInterval: 30000, // Refresh every 30 seconds
  });
  
  // Fetch recent harvest assignments
  const { data: harvests, isLoading: harvestsLoading } = useQuery({
    queryKey: ['recent-harvests'],
    queryFn: () => getHarvestAssignments({ limit: 5 }),
    refetchInterval: 30000,
  });
  
  // Fetch recent loading records
  const { data: loadings, isLoading: loadingsLoading } = useQuery({
    queryKey: ['recent-loadings'],
    queryFn: () => getLoadingRecords({ limit: 5 }),
    refetchInterval: 30000,
  });
  
  // Fetch recent transport trips
  const { data: transports, isLoading: transportsLoading } = useQuery({
    queryKey: ['recent-transports'],
    queryFn: () => getTransportTrips({ limit: 5 }),
    refetchInterval: 30000,
  });
  
  const summaryData = summary?.data || {};
  
  // Calculate statistics
  const harvestRevenue = summaryData.harvest_revenue || 0;
  const loadingRevenue = summaryData.loading_revenue || 0;
  const transportRevenue = summaryData.transport_revenue || 0;
  const totalRevenue = summaryData.total_revenue || 0;
  const totalCosts = summaryData.total_costs || 0;
  const sagibNet = summaryData.total_sagib_net || 0;
  const actualTons = summaryData.actual_tons || 0;
  const expectedTons = summaryData.expected_tons || 0;
  const tonnageVariance = actualTons - expectedTons;
  const tonnageVariancePercent = expectedTons > 0 ? (tonnageVariance / expectedTons) * 100 : 0;
  
  // Count active assignments (in_progress and not completed)
  const activeAssignments = harvests?.data?.filter(h => 
    h.computed_status === 'in_progress' || h.status === 'in_progress'
  ).length || 0;
  
  const statCards = [
    { 
      label: "This Week's Harvest Revenue", 
      value: formatCurrency(harvestRevenue), 
      subValue: `${formatTons(actualTons)} harvested`,
      color: "green",
      icon: Scale,
      trend: tonnageVariance > 0 ? 'up' : tonnageVariance < 0 ? 'down' : 'neutral',
      trendValue: `${Math.abs(tonnageVariancePercent).toFixed(1)}% ${tonnageVariance > 0 ? 'above' : tonnageVariance < 0 ? 'below' : ''} expectation`
    },
    { 
      label: "This Week's Loading Revenue", 
      value: formatCurrency(loadingRevenue), 
      subValue: `${formatTons(summaryData.loading_total_tons || 0)} loaded`,
      color: "blue",
      icon: Truck
    },
    { 
      label: "This Week's Transport Revenue", 
      value: formatCurrency(transportRevenue), 
      subValue: `${summaryData.transport_total_trips || 0} trips`,
      color: "amber",
      icon: TrendingUp
    },
    { 
      label: "Total Weekly Net", 
      value: formatCurrency(sagibNet), 
      subValue: `Profit after costs`,
      color: "green",
      icon: DollarSign
    },
    { 
      label: "Total Tons Handled", 
      value: formatTons(actualTons), 
      subValue: `${tonnageVariance > 0 ? '+' : ''}${formatTons(tonnageVariance)} vs expected`,
      color: "blue",
      icon: Package
    },
    { 
      label: "Active Assignments", 
      value: activeAssignments.toString(), 
      subValue: `${harvests?.data?.length || 0} total this week`,
      color: "amber",
      icon: Users
    }
  ];
  
  // Recent harvest columns
  const harvestColumns = [
    { key: "assignment_date", label: "Date", render: (v) => new Date(v).toLocaleDateString() },
    { key: "headman_name", label: "Headman" },
    { key: "field_code", label: "Field" },
    { key: "expected_tonnage", label: "Expected", render: (v) => formatTons(v) },
    { key: "actual_tonnage", label: "Actual", render: (v) => formatTons(v || 0) },
    { 
      key: "computed_status", 
      label: "Status",
      render: (v) => (
        <span className={`px-2 py-1 text-xs rounded-full ${
          v === 'completed' ? 'bg-green-100 text-green-800' :
          v === 'in_progress' ? 'bg-blue-100 text-blue-800' :
          v === 'cancelled' ? 'bg-red-100 text-red-800' :
          'bg-yellow-100 text-yellow-800'
        }`}>
          {v?.toUpperCase() || 'PENDING'}
        </span>
      )
    }
  ];
  
  // Recent loading columns
  const loadingColumns = [
    { key: "load_date", label: "Date", render: (v) => new Date(v).toLocaleDateString() },
    { key: "outgrower_name", label: "Outgrower" },
    { key: "tons_loaded", label: "Tons", render: (v) => formatTons(v) },
    { key: "weighbridge_name", label: "Weighbridge" }
  ];
  
  // Recent transport columns
  const transportColumns = [
    { key: "trip_date", label: "Date", render: (v) => new Date(v).toLocaleDateString() },
    { key: "plate_no", label: "Truck" },
    { key: "driver_name", label: "Driver" },
    { key: "tons_transported", label: "Tons", render: (v) => formatTons(v) },
    { key: "total_revenue", label: "Revenue", render: (v) => formatCurrency(v) }
  ];
  
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Dashboard Overview</h2>
        <p className="text-gray-600 mt-1">Week {currentWeek} • {weekDates.formatted}</p>
      </div>
      
      {/* Stat Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((stat, index) => (
          <div key={index} className="bg-white rounded-lg shadow p-6 border-l-4 border-${stat.color}-500">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm text-gray-600">{stat.label}</p>
                <p className="text-2xl font-bold mt-2 text-gray-900">{stat.value}</p>
                {stat.subValue && <p className="text-sm text-gray-500 mt-1">{stat.subValue}</p>}
                {stat.trend && (
                  <div className="flex items-center gap-1 mt-2">
                    {stat.trend === 'up' ? (
                      <ArrowUp className="h-3 w-3 text-green-600" />
                    ) : stat.trend === 'down' ? (
                      <ArrowDown className="h-3 w-3 text-red-600" />
                    ) : null}
                    <span className={`text-xs ${stat.trend === 'up' ? 'text-green-600' : stat.trend === 'down' ? 'text-red-600' : 'text-gray-500'}`}>
                      {stat.trendValue}
                    </span>
                  </div>
                )}
              </div>
              <stat.icon className="h-8 w-8 text-gray-400" />
            </div>
          </div>
        ))}
      </div>
      
      {/* Charts Section - Placeholder for future charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Weekly Revenue Breakdown</h3>
            <BarChart3 className="h-5 w-5 text-gray-400" />
          </div>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Harvest</span>
                <span>{formatCurrency(harvestRevenue)}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-green-600 h-2 rounded-full" style={{ width: `${totalRevenue > 0 ? (harvestRevenue / totalRevenue) * 100 : 0}%` }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Loading</span>
                <span>{formatCurrency(loadingRevenue)}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${totalRevenue > 0 ? (loadingRevenue / totalRevenue) * 100 : 0}%` }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Transport</span>
                <span>{formatCurrency(transportRevenue)}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-amber-600 h-2 rounded-full" style={{ width: `${totalRevenue > 0 ? (transportRevenue / totalRevenue) * 100 : 0}%` }} />
              </div>
            </div>
            <div className="pt-3 mt-2 border-t">
              <div className="flex justify-between text-sm font-medium">
                <span>Total Revenue</span>
                <span>{formatCurrency(totalRevenue)}</span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span>Total Costs</span>
                <span>{formatCurrency(totalCosts)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold mt-1 text-green-600">
                <span>Sagib Net</span>
                <span>{formatCurrency(sagibNet)}</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Tonnage Overview</h3>
            <PieChart className="h-5 w-5 text-gray-400" />
          </div>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Expected Tonnage</span>
                <span>{formatTons(expectedTons)}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${expectedTons > 0 ? (actualTons / expectedTons) * 100 : 0}%` }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Actual Tonnage</span>
                <span>{formatTons(actualTons)}</span>
              </div>
              <div className="flex justify-between text-sm mt-2">
                <span className="text-gray-500">Variance:</span>
                <span className={tonnageVariance >= 0 ? 'text-green-600' : 'text-red-600'}>
                  {tonnageVariance >= 0 ? '+' : ''}{formatTons(tonnageVariance)} ({tonnageVariancePercent.toFixed(1)}%)
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Tables Section */}
      <div className="grid grid-cols-1 gap-6">
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Recent Harvest Assignments</h3>
            <Calendar className="h-5 w-5 text-gray-400" />
          </div>
          <DataTable
            columns={harvestColumns}
            data={harvests?.data?.slice(0, 5) || []}
            loading={harvestsLoading}
            emptyMessage="No harvest assignments found"
          />
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Loading Records</h3>
            <DataTable
              columns={loadingColumns}
              data={loadings?.data?.slice(0, 5) || []}
              loading={loadingsLoading}
              emptyMessage="No loading records found"
            />
          </div>
          
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Transport Trips</h3>
            <DataTable
              columns={transportColumns}
              data={transports?.data?.slice(0, 5) || []}
              loading={transportsLoading}
              emptyMessage="No transport trips found"
            />
          </div>
        </div>
      </div>
      
      {/* Refresh timestamp */}
      <div className="text-right text-xs text-gray-400">
        Last updated: {new Date().toLocaleTimeString()}
      </div>
    </div>
  );
};

export default Dashboard;
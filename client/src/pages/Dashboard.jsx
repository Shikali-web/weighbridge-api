import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import WeekPicker from '../components/shared/WeekPicker';
import { formatCurrency, formatTons, getISOWeek } from '../utils/formatters';

const Dashboard = () => {
  const { user } = useAuth();
  const currentDate = new Date();
  const [week, setWeek] = useState(getISOWeek(currentDate));
  const [year, setYear] = useState(currentDate.getFullYear());

  const handleWeekChange = (newWeek, newYear) => {
    setWeek(newWeek);
    setYear(newYear);
  };

  // Role-specific dashboard
  if (user?.role === 'admin') {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Admin Dashboard</h2>
            <p className="text-gray-600 mt-1">Welcome back, {user?.full_name || user?.username}!</p>
          </div>
          <WeekPicker week={week} year={year} onChange={handleWeekChange} />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
            <p className="text-sm text-gray-500">Harvest Revenue</p>
            <p className="text-2xl font-bold mt-2">KES 0.00</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
            <p className="text-sm text-gray-500">Loading Revenue</p>
            <p className="text-2xl font-bold mt-2">KES 0.00</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-amber-500">
            <p className="text-sm text-gray-500">Transport Revenue</p>
            <p className="text-2xl font-bold mt-2">KES 0.00</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-primary">
            <p className="text-sm text-gray-500">Total Revenue</p>
            <p className="text-2xl font-bold mt-2 text-primary">KES 0.00</p>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Welcome to Sagib Enterprises</h3>
          <p className="text-gray-600">
            You are logged in as <strong>{user?.role?.toUpperCase()}</strong>. 
            Use the sidebar to navigate through the system.
          </p>
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500">Quick Links:</p>
            <div className="flex gap-4 mt-2">
              <a href="/harvesting" className="text-primary hover:underline">Harvest Assignments</a>
              <a href="/loading" className="text-primary hover:underline">Loading & Transport</a>
              <a href="/reports/daily" className="text-primary hover:underline">Daily Returns</a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (user?.role === 'supervisor') {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Supervisor Dashboard</h2>
            <p className="text-gray-600 mt-1">Welcome, {user?.full_name || user?.username}!</p>
          </div>
          <WeekPicker week={week} year={year} onChange={handleWeekChange} />
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Role: Supervisor</h3>
          <p className="text-gray-600">
            You can manage harvest assignments for your headmen and view headman performance reports.
          </p>
          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">Quick Actions:</p>
            <div className="flex gap-4 mt-2">
              <a href="/harvesting" className="text-blue-600 hover:underline">Manage Harvest Assignments</a>
              <a href="/reports/headman" className="text-blue-600 hover:underline">View Headman Performance</a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (user?.role === 'weighbridge') {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Weighbridge Dashboard</h2>
            <p className="text-gray-600 mt-1">Welcome, {user?.full_name || user?.username}!</p>
          </div>
          <WeekPicker week={week} year={year} onChange={handleWeekChange} />
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Role: Weighbridge Operator</h3>
          <p className="text-gray-600">
            You can record loading records and transport trips.
          </p>
          <div className="mt-4 p-4 bg-green-50 rounded-lg">
            <p className="text-sm text-green-800">Quick Actions:</p>
            <div className="flex gap-4 mt-2">
              <a href="/loading" className="text-green-600 hover:underline">Record New Load</a>
              <a href="/reports/daily" className="text-green-600 hover:underline">View Daily Returns</a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (user?.role === 'headman') {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Headman Dashboard</h2>
            <p className="text-gray-600 mt-1">Welcome, {user?.full_name || user?.username}!</p>
          </div>
          <WeekPicker week={week} year={year} onChange={handleWeekChange} />
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Role: Headman</h3>
          <p className="text-gray-600">
            You can view your performance metrics and harvest records.
          </p>
          <div className="mt-4 p-4 bg-purple-50 rounded-lg">
            <p className="text-sm text-purple-800">Quick Links:</p>
            <div className="flex gap-4 mt-2">
              <a href="/reports/headman" className="text-purple-600 hover:underline">View My Performance</a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <p>Welcome, {user?.full_name || user?.username}</p>
      <p>Role: {user?.role}</p>
    </div>
  );
};

export default Dashboard;
import React from 'react';
import { useAuth } from '../context/AuthContext';

const SimpleDashboard = () => {
  const { user, logout } = useAuth();

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
      <div className="bg-white rounded-lg shadow p-6 mb-4">
        <h2 className="text-lg font-semibold mb-2">User Info</h2>
        <p><strong>Username:</strong> {user?.username}</p>
        <p><strong>Full Name:</strong> {user?.full_name}</p>
        <p><strong>Role:</strong> {user?.role}</p>
        <p><strong>User ID:</strong> {user?.id}</p>
      </div>
      <button
        onClick={logout}
        className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
      >
        Logout
      </button>
    </div>
  );
};

export default SimpleDashboard;
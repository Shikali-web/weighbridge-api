import React from 'react';

const StatCard = ({ label, value, subValue, color = 'green', icon: Icon }) => {
  const colors = {
    green: 'border-green-500',
    blue: 'border-blue-500',
    amber: 'border-amber-500',
    red: 'border-red-500',
    gray: 'border-gray-500'
  };

  return (
    <div className={`bg-white rounded-lg shadow p-6 border-l-4 ${colors[color]}`}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm text-gray-600">{label}</p>
          <p className="text-2xl font-bold mt-2 text-gray-900">{value}</p>
          {subValue && <p className="text-sm text-gray-500 mt-1">{subValue}</p>}
        </div>
        {Icon && <Icon className="h-8 w-8 text-gray-400" />}
      </div>
    </div>
  );
};

export default StatCard;
import React from 'react';

const TestStyling = () => {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-4">Tailwind CSS Test</h1>
      
      <div className="space-y-4">
        <div className="p-4 bg-red-500 text-white rounded">
          ✅ This should be RED background with WHITE text
        </div>
        
        <div className="p-4 bg-blue-500 text-white rounded">
          ✅ This should be BLUE background with WHITE text
        </div>
        
        <div className="p-4 bg-green-500 text-white rounded">
          ✅ This should be GREEN background with WHITE text
        </div>
        
        <div className="p-4 bg-[#1a3c2e] text-white rounded">
          ✅ This should be DARK GREEN (#1a3c2e) background with WHITE text
        </div>
        
        <div className="p-4 bg-[#2c5e4a] text-white rounded">
          ✅ This should be LIGHTER GREEN (#2c5e4a) background with WHITE text
        </div>
        
        <div className="p-4 bg-[#4caf7d] text-white rounded">
          ✅ This should be ACCENT GREEN (#4caf7d) background with WHITE text
        </div>
        
        <div className="p-4 bg-[#f8f9fa] text-gray-900 border rounded">
          ✅ This should be LIGHT GRAY background with DARK text
        </div>
      </div>
      
      <div className="mt-8 p-4 bg-gray-100 rounded">
        <p className="text-gray-700">
          If all the boxes above show colored backgrounds, Tailwind CSS is working!
        </p>
      </div>
    </div>
  );
};

export default TestStyling;
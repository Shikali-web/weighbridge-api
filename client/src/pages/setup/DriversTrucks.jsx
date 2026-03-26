import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import DriversList from './DriversList';
import TrucksList from './TrucksList';

const DriversTrucks = () => {
  const [activeTab, setActiveTab] = useState('drivers');

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Drivers & Trucks</h2>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="drivers">Drivers</TabsTrigger>
          <TabsTrigger value="trucks">Trucks</TabsTrigger>
        </TabsList>
        
        <TabsContent value="drivers" className="mt-6">
          <DriversList />
        </TabsContent>
        
        <TabsContent value="trucks" className="mt-6">
          <TrucksList />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DriversTrucks;
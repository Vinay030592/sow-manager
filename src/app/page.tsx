'use client';
import { useState } from 'react';
import SowManagement from "@/components/sow-management";
import { AnalyticsTab } from "@/components/analytics-tab";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { initialSows } from '@/lib/data';
import type { SOW } from '@/lib/types';


export default function Home() {
  const [sows, setSows] = useState<SOW[]>(initialSows);
  const [activeTab, setActiveTab] = useState('dashboard');

  const handleSaveSow = (sowToSave: SOW) => {
    setSows(prevSows => {
      const exists = prevSows.some(s => s.id === sowToSave.id);
      if (exists) {
        return prevSows.map(s => (s.id === sowToSave.id ? sowToSave : s));
      }
      return [...prevSows, sowToSave];
    });
  };

  const handleDeleteSow = (sowId: string) => {
    setSows(prevSows => prevSows.filter(s => s.id !== sowId));
  }

  return (
    <div className="container mx-auto p-4 md:p-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="dashboard">SOW Dashboard</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>
        <TabsContent value="dashboard" className="mt-6">
          <SowManagement 
            sows={sows}
            onSave={handleSaveSow}
            onDelete={handleDeleteSow}
          />
        </TabsContent>
        <TabsContent value="analytics" className="mt-6">
          <AnalyticsTab sows={sows} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

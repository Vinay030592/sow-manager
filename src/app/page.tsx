'use client';
import { useState, useEffect } from 'react';
import SowManagement from "@/components/sow-management";
import { AnalyticsTab } from "@/components/analytics-tab";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { initialSows } from '@/lib/data';
import type { SOW } from '@/lib/types';
import { saveSow, deleteSow, subscribeSows } from '@/lib/firestore';

export default function Home() {
  const [sows, setSows] = useState<SOW[]>([]);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeSows((firestoreSows) => {
      setSows(firestoreSows);
      setLoading(false);
      if (firestoreSows.length === 0) {
        initialSows.forEach((sow) => saveSow(sow));
      }
    });
    return () => unsubscribe();
  }, []);

  const handleSaveSow = async (sowToSave: SOW) => { await saveSow(sowToSave); };
  const handleDeleteSow = async (sowId: string) => { await deleteSow(sowId); };

  if (loading) {
    return (
      <div className="container mx-auto p-4 md:p-6 flex items-center justify-center min-h-[50vh]">
        <p className="text-muted-foreground text-lg">Loading SOWs...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="dashboard">SOW Dashboard</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>
        <TabsContent value="dashboard" className="mt-6">
          <SowManagement sows={sows} onSave={handleSaveSow} onDelete={handleDeleteSow} />
        </TabsContent>
        <TabsContent value="analytics" className="mt-6">
          <AnalyticsTab sows={sows} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

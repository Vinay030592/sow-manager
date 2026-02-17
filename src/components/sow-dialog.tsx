'use client';

import { useState, useEffect } from 'react';
import type { SOW } from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SowDetailsTab } from '@/components/sow-details-tab';
import { SowBillingTab } from '@/components/sow-billing-tab';
import { Loader2 } from 'lucide-react';

interface SowDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  sow: SOW | null;
  onSave: (sow: SOW) => void;
  initialTab?: 'details' | 'billing';
}

export function SowDialog({ isOpen, setIsOpen, sow, onSave, initialTab = 'details' }: SowDialogProps) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [isExtracting, setIsExtracting] = useState(false);

  const handleSaveDetails = (savedSow: SOW) => {
    onSave(savedSow);
    setIsOpen(false);
  };

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setIsExtracting(false); // Reset on open
    }
  }, [isOpen, initialTab]);

  const handleOpenChange = (open: boolean) => {
    if (!isExtracting) {
      setIsOpen(open);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col relative">
        {isExtracting && (
          <div className="absolute inset-0 bg-background/80 z-20 flex flex-col items-center justify-center rounded-lg">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Extracting details, please wait...</p>
          </div>
        )}
        <DialogHeader>
          <DialogTitle className="font-headline text-2xl">
            {sow ? 'Edit SOW' : 'Add New SOW'}
          </DialogTitle>
          <DialogDescription>
            {sow
              ? `Editing SOW for ${sow.projectName}.`
              : 'Add a new Statement of Work. You can upload a document to autofill details.'}
          </DialogDescription>
        </DialogHeader>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="details" disabled={isExtracting}>SOW Details</TabsTrigger>
              <TabsTrigger value="billing" disabled={!sow || isExtracting}>
                Monthly Billing
              </TabsTrigger>
            </TabsList>
            <TabsContent value="details" className="flex-1 overflow-y-auto p-1 mt-4">
              <SowDetailsTab 
                sow={sow} 
                onSave={handleSaveDetails} 
                isExtracting={isExtracting}
                setIsExtracting={setIsExtracting}
              />
            </TabsContent>
            {sow && (
              <TabsContent value="billing" className="flex-1 overflow-y-auto p-1 mt-4">
                <SowBillingTab sow={sow} />
              </TabsContent>
            )}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

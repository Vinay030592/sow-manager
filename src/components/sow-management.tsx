'use client';

import { useState, useMemo } from 'react';
import { Plus } from 'lucide-react';
import type { SOW } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { SowCard } from '@/components/sow-card';
import { SowDialog } from '@/components/sow-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { parseISO } from 'date-fns';

interface SowManagementProps {
  sows: SOW[];
  onSave: (sow: SOW) => void;
  onDelete: (id: string) => void;
}

export default function SowManagement({ sows, onSave, onDelete }: SowManagementProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSow, setEditingSow] = useState<SOW | null>(null);
  const [initialTab, setInitialTab] = useState<'details' | 'billing'>('details');
  const [selectedManager, setSelectedManager] = useState<string>('all');

  const managers = useMemo(() => ['all', ...Array.from(new Set(sows.map(s => s.clientManager)))], [sows]);

  const filteredSows = useMemo(() => {
    const filtered = selectedManager === 'all'
      ? sows
      : sows.filter(sow => sow.clientManager === selectedManager);

    return filtered.sort((a, b) => parseISO(a.startDate).getTime() - parseISO(b.startDate).getTime());
  }, [sows, selectedManager]);

  const handleAddNew = () => {
    setEditingSow(null);
    setInitialTab('details');
    setIsDialogOpen(true);
  };

  const handleEdit = (sow: SOW) => {
    setEditingSow(sow);
    setInitialTab('details');
    setIsDialogOpen(true);
  };

  const handleViewBilling = (sow: SOW) => {
    setEditingSow(sow);
    setInitialTab('billing');
    setIsDialogOpen(true);
  };

  const handleSaveAndClose = (sowToSave: SOW) => {
    onSave(sowToSave);
    setIsDialogOpen(false);
    setEditingSow(null);
  };

  return (
    <>
      <div className="flex items-center justify-between mb-8">
        <div className='flex items-center gap-4'>
            <h2 className="font-headline text-3xl font-bold">SOWs</h2>
            <Select value={selectedManager} onValueChange={setSelectedManager}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by Client Manager" />
              </SelectTrigger>
              <SelectContent>
                {managers.map(manager => (
                  <SelectItem key={manager} value={manager}>
                    {manager === 'all' ? 'All Managers' : manager}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
        </div>
        <Button onClick={handleAddNew}>
          <Plus className="mr-2" />
          Add New SOW
        </Button>
      </div>

      {filteredSows.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredSows.map(sow => (
            <SowCard
              key={sow.id}
              sow={sow}
              onEdit={() => handleEdit(sow)}
              onViewBilling={() => handleViewBilling(sow)}
              onDelete={() => onDelete(sow.id)} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 text-muted-foreground">
          <p>No SOWs found for the selected manager.</p>
        </div>
      )}

      <SowDialog
        isOpen={isDialogOpen}
        setIsOpen={setIsDialogOpen}
        sow={editingSow}
        onSave={handleSaveAndClose}
        initialTab={initialTab}
      />
    </>
  );
}

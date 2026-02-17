import type { SOW } from '@/lib/types';

const today = new Date();
const currentYear = today.getFullYear();

// Helper to get a date a few months from now
const getFutureDate = (months: number): string => {
  const date = new Date();
  date.setMonth(date.getMonth() + months);
  return date.toISOString().split('T')[0];
};

export const initialSows: SOW[] = [
  {
    id: 'sow-1',
    projectName: 'Project Phoenix',
    vendorName: 'Innovate Solutions',
    vendorManager: 'John Smith',
    purchaseOrderNumber: 'PO-2024-001',
    startDate: `${currentYear}-01-01`,
    endDate: getFutureDate(2), // Due for renewal in 2 months
    billingRates: [
      { year: currentYear - 2, ratePerResource: 100000 },
      { year: currentYear - 1, ratePerResource: 110000 },
      { year: currentYear, ratePerResource: 120000 },
    ],
    numberOfResources: 5,
    clientManager: 'Alice Johnson',
  },
  {
    id: 'sow-2',
    projectName: 'Quantum Leap',
    vendorName: 'TechGenix Inc.',
    vendorManager: 'David Chen',
    purchaseOrderNumber: 'PO-2024-002',
    startDate: `${currentYear - 1}-11-15`,
    endDate: getFutureDate(8), // Not due for renewal
    billingRates: [
      { year: currentYear - 1, ratePerResource: 250000 },
      { year: currentYear, ratePerResource: 275000 },
    ],
    numberOfResources: 3,
    clientManager: 'Bob Williams',
  },
  {
    id: 'sow-3',
    projectName: 'Odyssey Initiative',
    vendorName: 'Creative Minds LLC',
    vendorManager: 'Maria Garcia',
    purchaseOrderNumber: 'PO-2024-003',
    startDate: `${currentYear - 2}-07-01`,
    endDate: getFutureDate(11), // Not due for renewal
    billingRates: [
      { year: currentYear - 2, ratePerResource: 85000 },
      { year: currentYear - 1, ratePerResource: 90000 },
      { year: currentYear, ratePerResource: 95000 },
    ],
    numberOfResources: 10,
    clientManager: 'Alice Johnson',
  },
];

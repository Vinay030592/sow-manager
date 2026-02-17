export type BillingRate = {
  year: number;
  ratePerResource: number;
};

export type SOW = {
  id: string;
  projectName: string;
  vendorName: string;
  vendorManager: string;
  purchaseOrderNumber?: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  billingRates: BillingRate[];
  numberOfResources: number;
  clientManager: string;
};

export type ResourceLeave = {
  resourceName: string;
  leaveDays: number;
};

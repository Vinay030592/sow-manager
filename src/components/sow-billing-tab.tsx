'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { CalendarIcon } from 'lucide-react';
import { format, addMonths, isBefore, isEqual, parseISO, max, min } from 'date-fns';

import type { SOW, ResourceLeave } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Calendar } from './ui/calendar';
import { cn } from '@/lib/utils';
import { Label } from './ui/label';

interface SowBillingTabProps {
  sow: SOW;
}

interface MonthlyBillingData {
  monthId: string; // "YYYY-MM"
  billingPeriodStartDate: Date;
  billingPeriodEndDate: Date;
  regionalHolidays: number;
  actualNumberOfResources: number;
  resourceLeaves: ResourceLeave[];
}

// Function to calculate working days (Mon-Fri) between two dates
function getWorkingDays(startDate: Date, endDate: Date): number {
    if (!startDate || !endDate || isBefore(endDate, startDate)) return 0;
    let workingDays = 0;
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
        const day = currentDate.getDay();
        if (day !== 0 && day !== 6) { // 0=Sun, 6=Sat
            workingDays++;
        }
        currentDate.setDate(currentDate.getDate() + 1);
    }
    return workingDays;
}

function getRateForYear(billingRates: { year: number; ratePerResource: number }[], year: number): number {
  if (!billingRates || billingRates.length === 0) {
    return 0;
  }
  // Sort rates by year descending to easily find the most recent applicable rate
  const sortedRates = [...billingRates].sort((a, b) => b.year - a.year);
  // Find the first rate where the rate's year is less than or equal to the target year
  const applicableRate = sortedRates.find(rate => rate.year <= year);
  return applicableRate?.ratePerResource || 0;
}

// Function to generate billing periods for the SOW duration
function getBillingPeriods(sow: SOW): MonthlyBillingData[] {
  const periods: MonthlyBillingData[] = [];
  const sowStartDate = parseISO(sow.startDate);
  const sowEndDate = parseISO(sow.endDate);

  let currentPeriodDate = new Date(sowStartDate.getFullYear(), sowStartDate.getMonth(), 1);

  while (isBefore(currentPeriodDate, sowEndDate) || isEqual(currentPeriodDate, sowEndDate)) {
    const year = currentPeriodDate.getFullYear();
    const month = currentPeriodDate.getMonth(); // 0-indexed

    const billingEndDate = new Date(year, month, 25);
    const billingStartDate = new Date(year, month - 1, 26);
    
    // Ensure the generated period is within the SOW's timeframe
    if (billingEndDate >= sowStartDate && billingStartDate <= sowEndDate) {
      periods.push({
        monthId: format(currentPeriodDate, 'yyyy-MM'),
        billingPeriodStartDate: billingStartDate,
        billingPeriodEndDate: billingEndDate,
        regionalHolidays: 0,
        actualNumberOfResources: sow.numberOfResources,
        resourceLeaves: Array.from({ length: sow.numberOfResources }, (_, i) => ({
            resourceName: `Resource ${i + 1}`,
            leaveDays: 0,
        })),
      });
    }
    currentPeriodDate = addMonths(currentPeriodDate, 1);
  }

  return periods.reverse(); // Show most recent first
}

export function SowBillingTab({ sow }: SowBillingTabProps) {
  const [monthlyData, setMonthlyData] = useState<MonthlyBillingData[]>([]);
  const [usdConversionRate, setUsdConversionRate] = useState<number>(83.0); // Default conversion rate
  const [openMonthId, setOpenMonthId] = useState<string | undefined>();
  const monthAccordionItemRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    if (sow) {
      const billingPeriods = getBillingPeriods(sow);
      setMonthlyData(billingPeriods);

      const now = new Date();
      const currentMonthData = billingPeriods.find(
        (period) => now >= period.billingPeriodStartDate && now <= period.billingPeriodEndDate
      );
      
      const defaultOpenId = currentMonthData?.monthId || (billingPeriods.length > 0 ? billingPeriods[0].monthId : undefined);
      setOpenMonthId(defaultOpenId);

      if (defaultOpenId) {
        setTimeout(() => {
          monthAccordionItemRefs.current[defaultOpenId]?.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
          });
        }, 100);
      }
    }
  }, [sow]);
  
  const currentBillingMonthId = useMemo(() => {
    if (!monthlyData.length) return null;
    const now = new Date();
    const currentPeriod = monthlyData.find(
      (period) => now >= period.billingPeriodStartDate && now <= period.billingPeriodEndDate
    );
    return currentPeriod?.monthId;
  }, [monthlyData]);

  const handleStateChange = <K extends keyof MonthlyBillingData>(monthId: string, key: K, value: MonthlyBillingData[K]) => {
      setMonthlyData(prevData =>
        prevData.map(data => (data.monthId === monthId ? { ...data, [key]: value } : data))
      );
  };

  const handleLeaveChange = (monthId: string, resourceIndex: number, leaveDays: number) => {
    setMonthlyData(prevData =>
      prevData.map(data => {
        if (data.monthId === monthId) {
          const newLeaves = [...data.resourceLeaves];
          newLeaves[resourceIndex] = { ...newLeaves[resourceIndex], leaveDays };
          return { ...data, resourceLeaves: newLeaves };
        }
        return data;
      })
    );
  };
  
  const handleResourceCountChange = (monthId: string, newSize: number) => {
      setMonthlyData(prevData =>
          prevData.map(data => {
              if (data.monthId === monthId) {
                  const currentLeaves = data.resourceLeaves;
                  const newLeaves = Array.from({ length: newSize }, (_, i) => ({
                      resourceName: `Resource ${i + 1}`,
                      leaveDays: currentLeaves[i]?.leaveDays || 0,
                  }));
                  return { ...data, actualNumberOfResources: newSize, resourceLeaves: newLeaves };
              }
              return data;
          })
      );
  };

  const previewBilling = useMemo(() => {
    const now = new Date();
    // Find the billing period that includes today's date.
    const currentMonthData = monthlyData.find(
        (period) => now >= period.billingPeriodStartDate && now <= period.billingPeriodEndDate
    );
    
    // If we are within a billing period, use that. Otherwise, use the most recent one (first in the reversed list).
    const targetMonth = currentMonthData || monthlyData[0];
    
    if (!targetMonth) return { amount: 0, billableDays: 0, dailyRate: 0, monthlyRate: 0, monthName: '' };
    
    const sowStartDate = parseISO(sow.startDate);
    const sowEndDate = parseISO(sow.endDate);

    const year = targetMonth.billingPeriodEndDate.getFullYear();
    const monthlyRate = getRateForYear(sow.billingRates, year);
    const dailyRate = monthlyRate / 21; // As per user, monthly rate is for 21 days
    
    const effectiveStart = max([targetMonth.billingPeriodStartDate, sowStartDate]);
    const effectiveEnd = min([targetMonth.billingPeriodEndDate, sowEndDate]);

    const workingDays = getWorkingDays(effectiveStart, effectiveEnd);
    const billableDays = workingDays - targetMonth.regionalHolidays;

    const totalLeaveDays = targetMonth.resourceLeaves.reduce((sum, leave) => sum + leave.leaveDays, 0);
    const totalBillableDaysForAllResources = (billableDays * targetMonth.actualNumberOfResources) - totalLeaveDays;

    return { 
        amount: totalBillableDaysForAllResources * dailyRate,
        billableDays,
        dailyRate,
        monthlyRate,
        monthName: format(targetMonth.billingPeriodEndDate, 'MMMM yyyy')
    };
  }, [monthlyData, sow]);
  
  const formatINR = (amount: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(amount);
  const formatUSD = (amount: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(amount);

  return (
    <div className='flex flex-col h-full'>
      <div className="sticky top-0 z-10 bg-background pb-3">
          <Card>
              <CardHeader className='flex-row items-center justify-between'>
                  <div className='space-y-1.5'>
                    <CardTitle className="font-headline text-lg">Monthly Billing Preview</CardTitle>
                    <CardDescription>{previewBilling.monthName}</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="usd-rate" className='text-xs text-muted-foreground'>USD Rate:</Label>
                    <Input id="usd-rate" type="number" value={usdConversionRate} onChange={e => setUsdConversionRate(e.target.valueAsNumber || 0)} className="w-24 h-8" />
                  </div>
              </CardHeader>
              <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                      <div>
                          <p className="text-xs text-muted-foreground">Monthly Rate (Per Resource)</p>
                          <p className="text-base font-bold">{formatINR(previewBilling.monthlyRate)}</p>
                      </div>
                      <div>
                          <p className="text-xs text-muted-foreground">Est. Daily Rate</p>
                          <p className="text-base font-bold">{formatINR(previewBilling.dailyRate)}</p>
                      </div>
                      <div>
                          <p className="text-xs text-muted-foreground">Billable Days</p>
                          <p className="text-base font-bold">{previewBilling.billableDays}</p>
                      </div>
                      <div className='relative'>
                          <p className="text-xs text-muted-foreground">Total Expected Billing</p>
                          <p className="text-base font-bold">~ {formatINR(previewBilling.amount)}</p>
                          {usdConversionRate > 0 && (
                            <p className="text-xs text-muted-foreground absolute bottom-[-1.4rem] w-full text-center">
                              {formatUSD(previewBilling.amount / usdConversionRate)}
                            </p>
                          )}
                      </div>
                  </div>
              </CardContent>
          </Card>
      </div>

      <div className='flex-1 overflow-y-auto'>
        <Accordion type="single" collapsible className="w-full" value={openMonthId} onValueChange={setOpenMonthId}>
          {monthlyData.map((month) => {
            const sowStartDate = parseISO(sow.startDate);
            const sowEndDate = parseISO(sow.endDate);

            const year = month.billingPeriodEndDate.getFullYear();
            const monthlyRate = getRateForYear(sow.billingRates, year);
            const dailyRate = monthlyRate / 21; // Daily rate based on 21 working days/month
            
            const effectiveStart = max([month.billingPeriodStartDate, sowStartDate]);
            const effectiveEnd = min([month.billingPeriodEndDate, sowEndDate]);

            const workingDays = getWorkingDays(effectiveStart, effectiveEnd);
            const billableDaysAfterHolidays = workingDays - month.regionalHolidays;
            
            const totalLeaveDays = month.resourceLeaves.reduce((acc, leave) => acc + (leave.leaveDays || 0), 0);
            const totalBillableDays = (billableDaysAfterHolidays * month.actualNumberOfResources) - totalLeaveDays;
            const totalMonthBillingINR = Math.max(0, totalBillableDays * dailyRate);
            const isCurrentMonth = month.monthId === currentBillingMonthId;

            return (
              <AccordionItem value={month.monthId} key={month.monthId} ref={(el) => (monthAccordionItemRefs.current[month.monthId] = el)}>
                <AccordionTrigger className={cn('group py-2 rounded-md transition-colors hover:bg-muted/50 data-[state=open]:bg-primary data-[state=open]:text-primary-foreground', isCurrentMonth && 'bg-accent')}>
                  <div className='flex justify-between items-center w-full pr-4'>
                      <span className='text-sm font-medium'>{format(month.billingPeriodEndDate, 'MMMM yyyy')}</span>
                      <span className='text-xs text-muted-foreground group-data-[state=open]:text-primary-foreground/80 hidden md:inline'>
                          {format(month.billingPeriodStartDate, 'MMM d')} - {format(month.billingPeriodEndDate, 'MMM d, yyyy')}
                      </span>
                      <span className='text-xs text-muted-foreground group-data-[state=open]:text-primary-foreground/80'>{billableDaysAfterHolidays} billable days</span>
                      <div className="relative text-right">
                        <p className="text-sm font-bold">{formatINR(totalMonthBillingINR)}</p>
                        {usdConversionRate > 0 && (
                          <p className="text-xs text-muted-foreground group-data-[state=open]:text-primary-foreground/80">
                            {formatUSD(totalMonthBillingINR / usdConversionRate)}
                          </p>
                        )}
                      </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-3 pb-2 pt-1">
                  <div className='grid grid-cols-1 md:grid-cols-4 gap-2'>
                      <div className="flex flex-col space-y-1">
                          <Label className="text-xs">Billing Start Date</Label>
                          <Popover><PopoverTrigger asChild><Button variant={"outline"} className={cn("pl-3 text-left font-normal h-8 text-xs", !month.billingPeriodStartDate && "text-muted-foreground")}>
                              {month.billingPeriodStartDate ? format(month.billingPeriodStartDate, "PPP") : <span>Pick a date</span>}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button></PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={month.billingPeriodStartDate} onSelect={(date) => date && handleStateChange(month.monthId, 'billingPeriodStartDate', date)} initialFocus /></PopoverContent></Popover>
                      </div>
                      <div className="flex flex-col space-y-1">
                          <Label className="text-xs">Billing End Date</Label>
                          <Popover><PopoverTrigger asChild><Button variant={"outline"} className={cn("pl-3 text-left font-normal h-8 text-xs", !month.billingPeriodEndDate && "text-muted-foreground")}>
                              {month.billingPeriodEndDate ? format(month.billingPeriodEndDate, "PPP") : <span>Pick a date</span>}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button></PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={month.billingPeriodEndDate} onSelect={(date) => date && handleStateChange(month.monthId, 'billingPeriodEndDate', date)} initialFocus /></PopoverContent></Popover>
                      </div>
                      <div className="space-y-1">
                          <Label className="text-xs">Regional Holidays</Label>
                          <Input type="number" className="h-8 text-xs" value={month.regionalHolidays} onChange={e => handleStateChange(month.monthId, 'regionalHolidays', e.target.valueAsNumber || 0)} />
                      </div>
                      <div className="space-y-1">
                          <Label className="text-xs">Actual No. of Resources</Label>
                          <Input type="number" className="h-8 text-xs" value={month.actualNumberOfResources} onChange={e => handleResourceCountChange(month.monthId, e.target.valueAsNumber || 0)} />
                      </div>
                  </div>

                  <Table>
                      <TableHeader><TableRow>
                          <TableHead className="py-1 px-2 text-xs">Resource</TableHead>
                          <TableHead className="py-1 px-2 text-xs">Leave Days</TableHead>
                          <TableHead className='text-right py-1 px-2 text-xs'>Estimated Bill (INR)</TableHead>
                      </TableRow></TableHeader>
                      <TableBody>
                          {month.resourceLeaves.map((resource, index) => {
                              const resourceBillableDays = Math.max(0, billableDaysAfterHolidays - resource.leaveDays);
                              const resourceBill = resourceBillableDays * dailyRate;
                              return (
                                  <TableRow key={index}>
                                      <TableCell className="py-1 px-2 text-xs">{resource.resourceName}</TableCell>
                                      <TableCell className="py-1 px-2 text-xs"><Input type="number" className="w-20 h-7 text-xs" value={resource.leaveDays} onChange={e => handleLeaveChange(month.monthId, index, e.target.valueAsNumber || 0)}/></TableCell>
                                      <TableCell className='text-right py-1 px-2 text-xs'>{formatINR(resourceBill)}</TableCell>
                                  </TableRow>
                              )
                          })}
                      </TableBody>
                      <TableFooter>
                          <TableRow>
                              <TableCell colSpan={2} className="font-bold py-2 px-2 text-xs">Total (INR)</TableCell>
                              <TableCell className='text-right font-bold py-2 px-2 text-xs'>{formatINR(totalMonthBillingINR)}</TableCell>
                          </TableRow>
                          {usdConversionRate > 0 && (
                              <TableRow>
                                  <TableCell colSpan={2} className="font-bold py-2 px-2 text-xs">Total (USD)</TableCell>
                                  <TableCell className='text-right font-bold py-2 px-2 text-xs'>{formatUSD(totalMonthBillingINR / usdConversionRate)}</TableCell>
                              </TableRow>
                          )}
                      </TableFooter>
                  </Table>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </div>
    </div>
  );
}

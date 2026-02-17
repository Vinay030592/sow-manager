'use client';
import { useMemo, useRef, useEffect, useState } from 'react';
import type { SOW } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  eachMonthOfInterval,
  format,
  startOfMonth,
  endOfMonth,
  areIntervalsOverlapping,
  parseISO,
  max,
  min,
  isBefore,
} from 'date-fns';
import { cn } from '@/lib/utils';
import React from 'react';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight } from 'lucide-react';

// Function to calculate working days (Mon-Fri) between two dates
function getWorkingDays(startDate: Date, endDate: Date): number {
    if (isBefore(endDate, startDate)) return 0;
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

const formatINR = (amount: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);

interface ManagerAnalyticsProps {
  sows: SOW[];
}

export function ManagerAnalytics({ sows }: ManagerAnalyticsProps) {
  const monthHeaderRefs = useRef<Record<string, HTMLTableCellElement | null>>({});
  const [collapsedManagers, setCollapsedManagers] = useState<string[]>([]);

  const toggleManagerCollapse = (managerName: string) => {
    setCollapsedManagers(current => 
        current.includes(managerName) 
            ? current.filter(m => m !== managerName)
            : [...current, managerName]
    );
  };

  const { groupedData, monthColumns, grandTotals, currentMonthId } = useMemo(() => {
    if (!sows || sows.length === 0) {
      return { groupedData: {}, monthColumns: [], grandTotals: {}, currentMonthId: null };
    }

    const allSowDates = sows.flatMap(sow => [parseISO(sow.startDate), parseISO(sow.endDate)]);
    const overallStartDate = min(allSowDates);
    const overallEndDate = max(allSowDates);

    const monthIntervals = eachMonthOfInterval({ start: overallStartDate, end: overallEndDate });
    
    const columns: {id: string; display: string; isQuarterly: boolean}[] = [];
    monthIntervals.forEach(date => {
        const monthId = format(date, 'yyyy-MM');
        columns.push({
            id: monthId,
            display: format(date, 'MMM yyyy'),
            isQuarterly: false,
        });

        const month = date.getMonth(); // 0-11
        if (month === 2 || month === 5 || month === 8 || month === 11) {
            const year = date.getFullYear();
            const quarter = Math.floor(month / 3) + 1;
            columns.push({
                id: `${year}-Q${quarter}`,
                display: `Q${quarter} ${year} Total`,
                isQuarterly: true,
            });
        }
    });

    const currentMonthId = format(new Date(), 'yyyy-MM');

    const sowsByManager: Record<string, SOW[]> = sows.reduce((acc, sow) => {
        const manager = sow.clientManager;
        if (!acc[manager]) {
            acc[manager] = [];
        }
        acc[manager].push(sow);
        return acc;
    }, {} as Record<string, SOW[]>);

    const data: Record<string, {sowsWithBilling: any[], managerTotals: Record<string, number>}> = {};
    const grandTotals: Record<string, number> = {};
    columns.forEach(col => grandTotals[col.id] = 0);

    Object.keys(sowsByManager).sort().forEach(manager => {
        const managerSows = sowsByManager[manager];
        const managerTotals: Record<string, number> = {};
        columns.forEach(col => managerTotals[col.id] = 0);
        
        const sowsWithBilling = managerSows.map(sow => {
            const sowStartDate = parseISO(sow.startDate);
            const sowEndDate = parseISO(sow.endDate);
            const sowInterval = { start: sowStartDate, end: sowEndDate };
            const billingData: { [id: string]: number } = {};

            monthIntervals.forEach(monthDate => {
                const monthId = format(monthDate, 'yyyy-MM');
                const monthStart = startOfMonth(monthDate);
                const monthEnd = endOfMonth(monthDate);
                let billing = 0;

                if (areIntervalsOverlapping(sowInterval, { start: monthStart, end: monthEnd }, { inclusive: true })) {
                    const year = monthStart.getFullYear();
                    const rate = getRateForYear(sow.billingRates, year);
                    const dailyRate = rate / 21;

                    const effectiveStart = max([monthStart, sowStartDate]);
                    const effectiveEnd = min([monthEnd, sowEndDate]);

                    const workingDays = getWorkingDays(effectiveStart, effectiveEnd);
                    billing = workingDays * sow.numberOfResources * dailyRate;
                }
                billingData[monthId] = billing;
            });
            
            let quarterSum = 0;
            monthIntervals.forEach(monthDate => {
                quarterSum += billingData[format(monthDate, 'yyyy-MM')] || 0;
                const month = monthDate.getMonth();
                if (month === 2 || month === 5 || month === 8 || month === 11) {
                    const year = monthDate.getFullYear();
                    const quarter = Math.floor(month / 3) + 1;
                    billingData[`${year}-Q${quarter}`] = quarterSum;
                    quarterSum = 0;
                }
            });

            columns.forEach(col => {
                managerTotals[col.id] += billingData[col.id] || 0;
            });

            return { ...sow, billingData };
        });
        
        columns.forEach(col => {
            grandTotals[col.id] += managerTotals[col.id] || 0;
        });

        data[manager] = {
            sowsWithBilling,
            managerTotals
        };
    });

    return { groupedData: data, monthColumns: columns, grandTotals, currentMonthId };
  }, [sows]);

  useEffect(() => {
    if (currentMonthId && monthHeaderRefs.current[currentMonthId]) {
      setTimeout(() => {
        monthHeaderRefs.current[currentMonthId]?.scrollIntoView({
          behavior: 'smooth',
          inline: 'center',
          block: 'nearest',
        });
      }, 100);
    }
  }, [currentMonthId, groupedData]);
  
  if (sows.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Monthly & Quarterly Billing Forecast</CardTitle>
        <CardDescription>Estimated billing per project, grouped by Client Manager.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto relative max-h-[70vh]">
          <Table>
            <TableHeader className="sticky top-0 bg-card z-20">
              <TableRow>
                <TableHead className="sticky left-0 bg-card z-30 min-w-[250px]">Project / Manager</TableHead>
                {monthColumns.map(month => (
                  <TableHead 
                    key={month.id}
                    ref={(el) => (monthHeaderRefs.current[month.id] = el)}
                    className={cn(
                      "text-right min-w-[150px] transition-colors",
                       month.id === currentMonthId && !month.isQuarterly && 'bg-accent',
                       month.isQuarterly && 'bg-muted font-semibold border-x'
                    )}
                  >
                    {month.display}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(groupedData).map(([manager, data]) => (
                <React.Fragment key={manager}>
                  <TableRow className="bg-secondary font-semibold hover:bg-secondary">
                    <TableCell className="sticky left-0 bg-secondary z-10">
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => toggleManagerCollapse(manager)}>
                          {collapsedManagers.includes(manager) ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </Button>
                        {manager}
                      </div>
                    </TableCell>
                    {monthColumns.map(month => (
                      <TableCell 
                        key={month.id} 
                        className={cn(
                          "text-right transition-colors",
                           month.id === currentMonthId && !month.isQuarterly && 'bg-accent',
                           month.isQuarterly && 'font-bold border-x bg-muted'
                        )}
                      >
                        {formatINR(data.managerTotals[month.id] || 0)}
                      </TableCell>
                    ))}
                  </TableRow>
                  {!collapsedManagers.includes(manager) && data.sowsWithBilling.map(sow => (
                    <TableRow key={sow.id} className="hover:bg-background">
                      <TableCell className="font-medium sticky left-0 bg-card hover:bg-background z-10 pl-12">{sow.projectName}</TableCell>
                      {monthColumns.map(month => (
                        <TableCell 
                          key={month.id} 
                          className={cn(
                            "text-right text-muted-foreground transition-colors",
                             month.id === currentMonthId && !month.isQuarterly && 'bg-accent/50',
                             month.isQuarterly && 'bg-muted/50 text-foreground font-medium border-x'
                          )}
                        >
                          {sow.billingData[month.id] > 0 ? formatINR(sow.billingData[month.id]) : '-'}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </React.Fragment>
              ))}
            </TableBody>
            <TableFooter className="sticky bottom-0 bg-muted z-20">
              <TableRow className="hover:bg-muted">
                <TableCell colSpan={1} className="font-bold sticky left-0 bg-muted z-30">Overall Monthly Estimates</TableCell>
                {monthColumns.map(month => (
                  <TableCell 
                    key={month.id} 
                    className={cn(
                      "text-right font-bold transition-colors",
                      month.id === currentMonthId && !month.isQuarterly && 'bg-accent',
                      month.isQuarterly && 'border-x'
                    )}
                  >
                    {formatINR(grandTotals[month.id] || 0)}
                  </TableCell>
                ))}
              </TableRow>
            </TableFooter>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

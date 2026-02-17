'use client';

import { differenceInMonths, format, isBefore, parseISO, startOfMonth, endOfMonth, areIntervalsOverlapping, max, min } from 'date-fns';
import { Calendar, Receipt, FilePenLine, FileText, Trash2, Users, UserSquare, User, CreditCard } from 'lucide-react';
import type { SOW } from '@/lib/types';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// Helper functions
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

const formatINR = (amount: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);


export function SowCard({ sow, onEdit, onViewBilling, onDelete }: SowCardProps) {
  const endDate = parseISO(sow.endDate);
  const startDate = parseISO(sow.startDate);
  const now = new Date();
  
  const isExpired = isBefore(endDate, now);
  const isRenewalDue = !isExpired && differenceInMonths(endDate, now) <= 3;

  const calculateCurrentMonthBilling = () => {
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    const sowInterval = { start: startDate, end: endDate };
    let billing = 0;

    if (areIntervalsOverlapping(sowInterval, { start: monthStart, end: monthEnd }, { inclusive: true })) {
        const year = now.getFullYear();
        const rate = getRateForYear(sow.billingRates, year);
        const dailyRate = rate / 21; // As per user, monthly rate is for 21 days

        const effectiveStart = max([monthStart, startDate]);
        const effectiveEnd = min([monthEnd, endDate]);

        const workingDays = getWorkingDays(effectiveStart, effectiveEnd);
        billing = workingDays * sow.numberOfResources * dailyRate;
    }
    return billing;
  };

  const currentMonthBilling = calculateCurrentMonthBilling();


  return (
    <Card className={cn("flex flex-col", isExpired && "bg-destructive/10 border-destructive/40")}>
       <CardHeader className="flex flex-row items-start justify-between p-4 pb-2">
        <div>
          <CardTitle className="font-headline text-base leading-tight">{sow.projectName}</CardTitle>
          <CardDescription className="text-xs pt-0.5">
            {sow.vendorName}
          </CardDescription>
        </div>
        <div className="flex items-center gap-1 -mt-1 -mr-2">
            <Button variant="ghost" size="icon" onClick={onViewBilling} className="h-7 w-7">
                <Receipt className="h-4 w-4" />
                <span className="sr-only">View Billing</span>
            </Button>
            <Button variant="ghost" size="icon" onClick={onEdit} className="h-7 w-7">
                <FilePenLine className="h-4 w-4" />
                <span className="sr-only">View / Edit</span>
            </Button>
            <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 hover:text-destructive h-7 w-7">
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Delete SOW</span>
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the SOW for {sow.projectName}.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={onDelete}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
      </CardHeader>
      <CardContent className="flex-grow flex flex-col p-4 pt-2 pb-4">
        <div className="flex-grow space-y-1">
          <div className="flex items-center text-xs text-muted-foreground">
            <UserSquare className="mr-2 h-3 w-3" />
            <span>Client: {sow.clientManager}</span>
          </div>
          <div className="flex items-center text-xs text-muted-foreground">
            <User className="mr-2 h-3 w-3" />
            <span>Vendor: {sow.vendorManager}</span>
          </div>
          <div className="flex items-center text-xs text-muted-foreground">
            <Users className="mr-2 h-3 w-3" />
            <span>{sow.numberOfResources} Resource{sow.numberOfResources > 1 ? 's' : ''}</span>
          </div>
          {sow.purchaseOrderNumber && (
            <div className="flex items-center text-xs text-muted-foreground">
              <FileText className="mr-2 h-3 w-3" />
              <span>{sow.purchaseOrderNumber}</span>
            </div>
          )}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
              <div className='flex items-center'>
                <Calendar className="mr-2 h-3 w-3" />
                <span>{format(startDate, 'MMM d, yyyy')}</span>
                <span className="mx-1.5">-</span>
                <span>{format(endDate, 'MMM d, yyyy')}</span>
              </div>
              {isRenewalDue && (
                <Badge variant="destructive">Renewal Due</Badge>
              )}
          </div>
        </div>
        {currentMonthBilling > 0 && !isExpired && (
            <div className="flex items-center text-sm font-semibold text-foreground pt-3 mt-3 border-t">
                <CreditCard className="mr-2 h-4 w-4 text-muted-foreground" />
                <span>{formatINR(currentMonthBilling)}</span>
                <span className="text-xs text-muted-foreground font-normal ml-1"> (Est. this month)</span>
            </div>
        )}
      </CardContent>
    </Card>
  );
}

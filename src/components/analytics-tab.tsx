'use client';
import { useMemo, useState } from 'react';
import type { SOW } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuCheckboxItem } from '@/components/ui/dropdown-menu';
import { Filter } from 'lucide-react';
import { ManagerAnalytics } from './manager-analytics';


interface AnalyticsTabProps {
  sows: SOW[];
}

const VENDOR_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  'hsl(262, 80%, 85%)',
  'hsl(210, 29%, 10%)'
];

export function AnalyticsTab({ sows }: AnalyticsTabProps) {
  const [currency, setCurrency] = useState<'INR' | 'USD'>('INR');
  const [conversionRate, setConversionRate] = useState<number>(83.0);
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);

  const { chartData, projectKeys, chartConfig, projectMap } = useMemo(() => {
    if (!sows || sows.length === 0) {
      return { chartData: [], projectKeys: [], chartConfig: {}, projectMap: new Map() };
    }

    const localProjectMap = new Map<string, { clientManager: string; vendorName: string; projectName: string }>();
    const allProjectKeys = new Set<string>();
    
    sows.forEach(sow => {
      const key = `${sow.vendorName} (${sow.projectName})`;
      allProjectKeys.add(key);
      if (!localProjectMap.has(key)) {
          localProjectMap.set(key, {
              clientManager: sow.clientManager,
              vendorName: sow.vendorName,
              projectName: sow.projectName
          });
      }
    });
    
    const activeProjectKeys = selectedProjects.length > 0 ? selectedProjects : Array.from(allProjectKeys);

    const dataByYear: { [year: number]: { year: number; [projectKey: string]: number } } = {};

    const filteredSows = sows.filter(sow => {
      if (selectedProjects.length === 0) return true;
      const key = `${sow.vendorName} (${sow.projectName})`;
      return selectedProjects.includes(key);
    });

    filteredSows.forEach(sow => {
      const projectKey = `${sow.vendorName} (${sow.projectName})`;

      sow.billingRates.forEach(rate => {
        if (!dataByYear[rate.year]) {
          dataByYear[rate.year] = { year: rate.year };
        }
        let rateValue = rate.ratePerResource;
        if (currency === 'USD' && conversionRate > 0) {
            rateValue = rateValue / conversionRate;
        }
        dataByYear[rate.year][projectKey] = rateValue;
      });
    });

    const sortedChartData = Object.values(dataByYear).sort((a, b) => a.year - b.year);
    
    const config: any = {};
    activeProjectKeys.forEach((key, index) => {
        config[key] = {
            label: key,
            color: VENDOR_COLORS[index % VENDOR_COLORS.length]
        }
    });

    return { 
        chartData: sortedChartData, 
        projectKeys: Array.from(allProjectKeys).sort(),
        chartConfig: config,
        projectMap: localProjectMap,
    };
  }, [sows, currency, conversionRate, selectedProjects]);

  const yAxisTickFormatter = (value: number) => {
    if (currency === 'INR') {
      return `₹${Number(value) / 1000}k`;
    }
    return `$${(Number(value) / 1000).toFixed(1)}k`;
  };

  const tooltipFormatter = (value: number, name: string) => {
    const projectDetails = projectMap.get(name);
    const formattedValue = new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : 'en-US', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: currency === 'INR' ? 0 : 2,
    }).format(value);

    return (
        <div className="flex flex-col gap-0.5">
            <span className="font-bold">{projectDetails?.projectName}</span>
            <span className="text-xs text-muted-foreground">{projectDetails?.vendorName}</span>
            <span className="font-semibold mt-1">{formattedValue}</span>
        </div>
    );
  };


  return (
    <div className="space-y-8">
      <ManagerAnalytics sows={sows} />
      <Card>
        <CardHeader>
          <CardTitle>Vendor Billing Rate Comparison</CardTitle>
          <CardDescription>Average monthly rate per resource by year</CardDescription>
          <div className='flex items-center justify-between pt-4'>
              <div className="flex items-center gap-6">
                  <RadioGroup value={currency} onValueChange={(value) => setCurrency(value as 'INR' | 'USD')} className="flex items-center">
                      <div className="flex items-center space-x-2">
                          <RadioGroupItem value="INR" id="inr" />
                          <Label htmlFor="inr">INR</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                          <RadioGroupItem value="USD" id="usd" />
                          <Label htmlFor="usd">USD</Label>
                      </div>
                  </RadioGroup>
                  {currency === 'USD' && (
                      <div className="flex items-center gap-2">
                          <Label htmlFor="usd-rate-analytics" className='text-sm text-muted-foreground'>Conversion Rate:</Label>
                          <Input id="usd-rate-analytics" type="number" value={conversionRate} onChange={e => setConversionRate(e.target.valueAsNumber || 0)} className="w-24 h-8" />
                      </div>
                  )}
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    <Filter className="mr-2 h-4 w-4" />
                    Filter Projects ({selectedProjects.length}/{projectKeys.length})
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-72 max-h-96 overflow-y-auto">
                  <DropdownMenuLabel>Filter by Project</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {projectKeys.map(key => (
                    <DropdownMenuCheckboxItem
                      key={key}
                      checked={selectedProjects.includes(key)}
                      onSelect={(e) => e.preventDefault()} // prevent closing on click
                      onCheckedChange={checked => {
                        if (checked) {
                          setSelectedProjects([...selectedProjects, key]);
                        } else {
                          setSelectedProjects(selectedProjects.filter(p => p !== key));
                        }
                      }}
                    >
                      {key}
                    </DropdownMenuCheckboxItem>
                  ))}
                   {selectedProjects.length > 0 && (
                      <>
                        <DropdownMenuSeparator />
                        <Button variant="ghost" size="sm" className="w-full" onClick={() => setSelectedProjects([])}>Clear Filters</Button>
                      </>
                    )}
                </DropdownMenuContent>
              </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent>
          {chartData.length > 0 ? (
            <ChartContainer config={chartConfig} className="min-h-[400px] w-full">
              <BarChart accessibilityLayer data={chartData}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="year"
                  tickLine={false}
                  tickMargin={10}
                  axisLine={false}
                />
                <YAxis
                  tickFormatter={yAxisTickFormatter}
                />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent
                      formatter={tooltipFormatter}
                      labelClassName='font-bold'
                   />}
                />
                <ChartLegend content={<ChartLegendContent />} />
                {Object.keys(chartConfig).map((projectKey) => (
                  <Bar
                    key={projectKey}
                    dataKey={projectKey}
                    fill={chartConfig[projectKey].color}
                    radius={4}
                  />
                ))}
              </BarChart>
            </ChartContainer>
          ) : (
            <div className="flex h-[400px] w-full items-center justify-center text-muted-foreground">
              <p>No billing data available for the selected filters.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

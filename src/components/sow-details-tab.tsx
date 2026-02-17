'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useFieldArray, useForm } from 'react-hook-form';
import * as z from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { useRef, useEffect } from 'react';
import { CalendarIcon, FileUp, Loader2, Plus, Trash2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useToast } from '@/hooks/use-toast';
import { handleSowExtraction } from '@/lib/actions';
import type { SOW } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const billingRateSchema = z.object({
  year: z.coerce.number().int().min(2000, "Invalid year"),
  ratePerResource: z.coerce.number().min(0, "Rate must be positive"),
});

const formSchema = z.object({
  projectName: z.string().min(2, {
    message: 'Project name must be at least 2 characters.',
  }),
  vendorName: z.string().min(2, {
    message: 'Vendor name must be at least 2 characters.',
  }),
  clientManager: z.string().min(2, {
    message: 'Client Manager name must be at least 2 characters.',
  }),
  vendorManager: z.string().min(2, {
    message: 'Vendor Manager name must be at least 2 characters.',
  }),
  purchaseOrderNumber: z.string().optional(),
  startDate: z.date({ required_error: 'A start date is required.' }),
  endDate: z.date({ required_error: 'An end date is required.' }),
  numberOfResources: z.coerce.number().int().min(1, 'At least one resource is required.'),
  billingRates: z.array(billingRateSchema).min(1, 'At least one billing rate is required.'),
});

type FormValues = z.infer<typeof formSchema>;

interface SowDetailsTabProps {
  sow: SOW | null;
  onSave: (sow: SOW) => void;
  isExtracting: boolean;
  setIsExtracting: (isExtracting: boolean) => void;
}

const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

export function SowDetailsTab({ sow, onSave, isExtracting, setIsExtracting }: SowDetailsTabProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      projectName: '',
      vendorName: '',
      clientManager: '',
      vendorManager: '',
      purchaseOrderNumber: '',
      numberOfResources: 1,
      billingRates: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'billingRates',
  });

  useEffect(() => {
    if (sow) {
      form.reset({
        projectName: sow.projectName,
        vendorName: sow.vendorName,
        clientManager: sow.clientManager,
        vendorManager: sow.vendorManager,
        purchaseOrderNumber: sow.purchaseOrderNumber || '',
        startDate: parseISO(sow.startDate),
        endDate: parseISO(sow.endDate),
        numberOfResources: sow.numberOfResources,
        billingRates: sow.billingRates,
      });
    } else {
      form.reset({
        projectName: '',
        vendorName: '',
        clientManager: '',
        vendorManager: '',
        purchaseOrderNumber: '',
        numberOfResources: 1,
        billingRates: [{year: new Date().getFullYear(), ratePerResource: 0}],
        startDate: undefined,
        endDate: undefined
      });
    }
  }, [sow, form]);


  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE_BYTES) {
      toast({
        variant: 'destructive',
        title: 'File Too Large',
        description: `The selected file exceeds the ${MAX_FILE_SIZE_MB}MB limit.`,
      });
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    setIsExtracting(true);
    try {
      const dataUri = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (error) => reject(error);
        reader.readAsDataURL(file);
      });

      const aiResult = await handleSowExtraction({ documentDataUri: dataUri });

      form.reset({
        projectName: aiResult.projectName || '',
        vendorName: aiResult.vendorName,
        clientManager: aiResult.clientManagerName || '',
        vendorManager: aiResult.vendorManagerName || '',
        purchaseOrderNumber: aiResult.purchaseOrderNumber || '',
        startDate: parseISO(aiResult.sowStartDate),
        endDate: parseISO(aiResult.sowEndDate),
        numberOfResources: aiResult.numberOfResources,
        billingRates: aiResult.billingRates,
      });

      toast({
        title: 'SOW Details Extracted',
        description: 'The form has been populated with data from the document.',
      });
    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Extraction Failed',
        description: error instanceof Error ? error.message : 'Could not extract details from the uploaded document. Please fill the form manually.',
      });
    } finally {
      setIsExtracting(false);
      if(fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  function onSubmit(values: FormValues) {
    const sowToSave: SOW = {
      id: sow?.id || uuidv4(),
      ...values,
      startDate: format(values.startDate, 'yyyy-MM-dd'),
      endDate: format(values.endDate, 'yyyy-MM-dd'),
    };
    onSave(sowToSave);
  }

  return (
    <div className="space-y-4 p-1">
      <Alert>
        <FileUp className="h-4 w-4" />
        <AlertTitle className='font-headline'>Automate with AI!</AlertTitle>
        <AlertDescription className="flex items-center justify-between">
          Upload a PDF (max ${MAX_FILE_SIZE_MB}MB) to automatically extract and fill in the details below.
          <Button
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isExtracting}
          >
            {isExtracting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <FileUp className="mr-2 h-4 w-4" />
            )}
            Upload SOW
          </Button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            accept="application/pdf"
          />
        </AlertDescription>
      </Alert>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="projectName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Project Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Project Phoenix" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="vendorName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vendor Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Innovate Solutions" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="clientManager"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Client Manager</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Jane Doe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="vendorManager"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vendor Manager</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., John Smith" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="numberOfResources"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Number of Resources</FormLabel>
                  <FormControl>
                    <Input type="number" min="1" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="purchaseOrderNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Purchase Order # (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., PO-12345" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="startDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>SOW Start Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="endDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>SOW End Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="space-y-2">
            <FormLabel>Monthly Billing Rate (INR)</FormLabel>
            <FormDescription>
              Monthly billing rate per resource in INR. Assumed to be for 21 working days.
            </FormDescription>
            {fields.map((field, index) => (
              <div key={field.id} className="flex items-start gap-2">
                <FormField
                  control={form.control}
                  name={`billingRates.${index}.year`}
                  render={({ field }) => (
                    <FormItem className="w-24">
                      <FormControl>
                        <Input type="number" placeholder="Year" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`billingRates.${index}.ratePerResource`}
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormControl>
                        <Input type="number" placeholder="Monthly Rate (INR)" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append({ year: new Date().getFullYear() + 1, ratePerResource: 0 })}
            >
              <Plus className="mr-2 h-4 w-4" /> Add Rate
            </Button>
            <FormMessage>{form.formState.errors.billingRates?.message}</FormMessage>
          </div>
          
          <div className="flex justify-end pt-2">
            <Button type="submit" disabled={isExtracting}>
              {isExtracting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isExtracting ? 'Extracting...' : (sow ? 'Save Changes' : 'Save SOW')}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

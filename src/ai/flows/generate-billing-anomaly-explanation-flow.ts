'use server';
/**
 * @fileOverview This file implements a Genkit flow for detecting and explaining anomalies in SOW monthly billing.
 *
 * - generateBillingAnomalyExplanation - A function that handles the billing anomaly detection and explanation process.
 * - GenerateBillingAnomalyExplanationInput - The input type for the generateBillingAnomalyExplanation function.
 * - GenerateBillingAnomalyExplanationOutput - The return type for the generateBillingAnomalyExplanation function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

// Input Schema
const SowBillingRateSchema = z.object({
  year: z.number().describe('The year for which this billing rate applies.'),
  ratePerResource: z.number().describe('The billing rate per resource for the given year.'),
});

const ResourceLeaveSchema = z.object({
  resourceName: z.string().describe('The name or identifier of the resource.'),
  leaveDays: z.number().min(0).describe('The number of leave days taken by this resource in the current month.'),
});

const GenerateBillingAnomalyExplanationInputSchema = z.object({
  vendorName: z.string().describe('The name of the vendor.'),
  sowStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe('The SOW start date in YYYY-MM-DD format.'),
  sowEndDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe('The SOW end date in YYYY-MM-DD format.'),
  billingRates: z.array(SowBillingRateSchema).describe('Historical and current billing rates.'),
  numberOfResources: z.number().min(1).describe('The total number of resources on the SOW.'),
  actualNumberOfResources: z.number().min(0).describe('The actual number of resources working for this billing period.'),
  billingPeriodStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe('The billing period start date in YYYY-MM-DD format.'),
  billingPeriodEndDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe('The billing period end date in YYYY-MM-DD format.'),
  actualBillingAmount: z.number().describe('The actual billing amount received for the current month.'),
  regionalHolidays: z.number().min(0).describe('The number of regional holidays in the current month.'),
  resourceLeaves: z.array(ResourceLeaveSchema).describe('Individual leave days for each resource in the current month.'),
  usdConversionRate: z.number().optional().describe('Optional: Conversion rate to USD if billing is in a different currency.'),
});


export type GenerateBillingAnomalyExplanationInput = z.infer<typeof GenerateBillingAnomalyExplanationInputSchema>;

// Output Schema
const GenerateBillingAnomalyExplanationOutputSchema = z.object({
  isAnomaly: z.boolean().describe('True if a significant billing anomaly is detected.'),
  expectedBillingAmount: z.number().describe('The calculated expected billing amount for the current month.'),
  explanation: z.string().describe('A natural language explanation of any detected anomaly or why the billing is as expected.'),
});

export type GenerateBillingAnomalyExplanationOutput = z.infer<typeof GenerateBillingAnomalyExplanationOutputSchema>;

// Wrapper function for the flow
export async function generateBillingAnomalyExplanation(
  input: GenerateBillingAnomalyExplanationInput
): Promise<GenerateBillingAnomalyExplanationOutput> {
  return generateBillingAnomalyExplanationFlow(input);
}

function getWorkingDaysForPeriod(startDate: Date, endDate: Date): number {
    let workingDays = 0;
    const currentDate = new Date(startDate);
    // Adjust for timezone offset to prevent off-by-one errors with dates
    currentDate.setMinutes(currentDate.getMinutes() + currentDate.getTimezoneOffset());
    const finalDate = new Date(endDate);
    finalDate.setMinutes(finalDate.getMinutes() + finalDate.getTimezoneOffset());

    while (currentDate <= finalDate) {
        const day = currentDate.getDay();
        if (day !== 0 && day !== 6) { // 0=Sun, 6=Sat
            workingDays++;
        }
        currentDate.setDate(currentDate.getDate() + 1);
    }
    return workingDays;
}


// Define anomaly threshold
const ANOMALY_THRESHOLD_PERCENTAGE = 0.05; // 5% deviation

const generateBillingAnomalyExplanationPrompt = ai.definePrompt({
  name: 'generateBillingAnomalyExplanationPrompt',
  model: 'googleai/gemini-2.5-flash',
  // Note: The input schema for the prompt is used for type checking and for LLM to understand structure.
  // We will pass an augmented input object to the prompt function with calculated values.
  input: {
    schema: GenerateBillingAnomalyExplanationInputSchema.extend({
      currentYearBillingRate: z.string().describe('The billing rate per resource for the current year, formatted as a string.'),
      expectedBillingAmount: z.string().describe('The calculated expected billing amount for the current month, formatted as a string.'),
      actualBillingAmount: z.string().describe('The actual billing amount received for the current month, formatted as a string.'),
      usdConversionRate: z.string().describe('The USD conversion rate applied, or "N/A" if not applicable, formatted as a string.'),
      isAnomaly: z.boolean().describe('Whether a significant anomaly was detected based on internal calculations.'),
      // Include original resourceLeaves for details in prompt, if needed for explanation context
      // The original schema already has it, so no need to extend for this.
    }),
  },
  output: { schema: GenerateBillingAnomalyExplanationOutputSchema },
  prompt: `You are an expert financial analyst specializing in SOW billing. Your task is to analyze the provided SOW details, expected billing, and actual billing to determine if there is a significant anomaly and provide a clear explanation.\n\nBased on the calculated expected billing amount, the actual billing amount, and considering a reasonable anomaly threshold (e.g., 5-10% deviation), determine if a significant anomaly exists. Provide a clear and concise explanation for your finding.\n\nUse the following specific values for your analysis:\n- Vendor Name: {{{vendorName}}}\n- SOW Start Date: {{{sowStartDate}}}\n- SOW End Date: {{{sowEndDate}}}\n- SOW Number of Resources: {{{numberOfResources}}}\n- Actual Number of Resources for Billing: {{{actualNumberOfResources}}}\n- Billing Period: {{{billingPeriodStartDate}}} to {{{billingPeriodEndDate}}}\n- Regional Holidays: {{{regionalHolidays}}} days\n{{#each resourceLeaves}}\n- Resource '{{{resourceName}}}' Leave Days: {{{leaveDays}}} days\n{{/each}}\n- Current Year Billing Rate per Resource (Daily): {{{currentYearBillingRate}}}\n- Expected Billing Amount (calculated): {{{expectedBillingAmount}}}\n- Actual Billing Amount: {{{actualBillingAmount}}}\n- USD Conversion Rate: {{{usdConversionRate}}}\n\nThe system's internal calculation indicates an anomaly: {{{isAnomaly}}}.\nPlease provide your response in JSON format according to the output schema.`,
});

const generateBillingAnomalyExplanationFlow = ai.defineFlow(
  {
    name: 'generateBillingAnomalyExplanationFlow',
    inputSchema: GenerateBillingAnomalyExplanationInputSchema,
    outputSchema: GenerateBillingAnomalyExplanationOutputSchema,
  },
  async (input) => {
    const currentYear = new Date(input.billingPeriodEndDate).getFullYear();

    // Find the current year's billing rate
    const currentYearBillingRateEntry = input.billingRates.find(
      (rate) => rate.year === currentYear
    );

    if (!currentYearBillingRateEntry) {
      throw new Error(`Billing rate for year ${currentYear} not found in the provided billingRates history.`);
    }

    const currentYearBillingRate = currentYearBillingRateEntry.ratePerResource;

    // Calculate base working days in the period
    const baseWorkingDaysInPeriod = getWorkingDaysForPeriod(new Date(input.billingPeriodStartDate), new Date(input.billingPeriodEndDate));

    let totalExpectedBilling = 0;

    const effectiveBaseWorkingDays = baseWorkingDaysInPeriod - input.regionalHolidays;

    for (let i = 0; i < input.actualNumberOfResources; i++) {
        const resourceLeaveDays = (input.resourceLeaves[i]?.leaveDays || 0);
        const billableDays = Math.max(0, effectiveBaseWorkingDays - resourceLeaveDays);
        totalExpectedBilling += billableDays * currentYearBillingRate;
    }

    let expectedBillingAmountUSD = totalExpectedBilling;
    if (input.usdConversionRate !== undefined && input.usdConversionRate > 0) {
      expectedBillingAmountUSD *= input.usdConversionRate;
    }

    const actualBillingAmountUSD = input.usdConversionRate !== undefined && input.usdConversionRate > 0
      ? input.actualBillingAmount * input.usdConversionRate
      : input.actualBillingAmount;

    // Determine if there's a significant anomaly based on a percentage deviation
    const deviation = Math.abs(actualBillingAmountUSD - expectedBillingAmountUSD);
    const relativeDeviation = expectedBillingAmountUSD > 0 ? deviation / expectedBillingAmountUSD : (deviation > 0 ? 1 : 0);

    const isAnomalyDetectedBySystem = relativeDeviation > ANOMALY_THRESHOLD_PERCENTAGE;

    // Prepare data for the prompt, including all calculated values
    const promptInput = {
      ...input,
      currentYearBillingRate: currentYearBillingRate.toFixed(2),
      expectedBillingAmount: expectedBillingAmountUSD.toFixed(2),
      actualBillingAmount: actualBillingAmountUSD.toFixed(2),
      usdConversionRate: input.usdConversionRate !== undefined ? input.usdConversionRate.toFixed(4) : 'N/A',
      isAnomaly: isAnomalyDetectedBySystem, // Pass the system's anomaly detection result to the LLM
    };

    const { output } = await generateBillingAnomalyExplanationPrompt(promptInput);

    if (!output) {
      throw new Error('No output from AI model.');
    }

    return {
      isAnomaly: output.isAnomaly, // Use the LLM's determined anomaly status
      expectedBillingAmount: expectedBillingAmountUSD,
      explanation: output.explanation,
    };
  }
);

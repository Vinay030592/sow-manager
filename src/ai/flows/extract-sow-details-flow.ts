'use server';
/**
 * @fileOverview This file contains a Genkit flow for extracting key SOW details from a document.
 *
 * - extractSOWDetails - A function that handles the SOW details extraction process.
 * - ExtractSOWDetailsInput - The input type for the extractSOWDetails function.
 * - ExtractSOWDetailsOutput - The return type for the extractSOWDetails function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const ExtractSOWDetailsInputSchema = z.object({
  documentDataUri: z
    .string()
    .describe(
      "The SOW document, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'. Supported mimetype is application/pdf."
    ),
});
export type ExtractSOWDetailsInput = z.infer<typeof ExtractSOWDetailsInputSchema>;

const ExtractSOWDetailsOutputSchema = z.object({
  projectName: z.string().optional().describe('The name of the project mentioned in the SOW.'),
  vendorName: z.string().describe('The name of the vendor mentioned in the SOW.'),
  clientManagerName: z.string().optional().describe('The name of the manager or primary contact for the client.'),
  vendorManagerName: z.string().optional().describe('The name of the manager or primary contact for the vendor.'),
  purchaseOrderNumber: z.string().optional().describe('The purchase order number, if available.'),
  sowStartDate: z.string().describe('The start date of the SOW in YYYY-MM-DD format.'),
  sowEndDate: z.string().describe('The end date of the SOW in YYYY-MM-DD format.'),
  billingRates: z
    .array(
      z.object({
        year: z.number().describe('The year for which the billing rate applies.'),
        ratePerResource: z
          .number()
          .describe('The billing rate per resource for the specified year.'),
      })
    )
    .describe('An array of billing rates, including the current year and, if available, the last two years.'),
  numberOfResources: z
    .number()
    .describe('The number of resources allocated for the SOW.'),
});
export type ExtractSOWDetailsOutput = z.infer<typeof ExtractSOWDetailsOutputSchema>;

export async function extractSOWDetails(
  input: ExtractSOWDetailsInput
): Promise<ExtractSOWDetailsOutput> {
  return extractSOWDetailsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'extractSOWDetailsPrompt',
  input: { schema: ExtractSOWDetailsInputSchema },
  output: { schema: ExtractSOWDetailsOutputSchema },
  prompt: `You are an expert at parsing Statement of Work (SOW) documents and extracting key details.
Analyze the provided SOW document and extract the following information:
1.  **Project Name**: The name of the project. If not explicitly mentioned, you can infer it from the context or leave it blank.
2.  **Vendor Name**: The official name of the vendor.
3.  **Client Manager Name**: The name of the primary contact or manager for the client (this person may be referred to as an engineering leader or business leader). If not explicitly mentioned, leave it blank.
4.  **Vendor Manager Name**: The name of the primary contact or manager for the vendor. If not explicitly mentioned, leave it blank.
5.  **Purchase Order Number**: The PO number associated with the SOW, if present.
6.  **SOW Start Date**: The start date of the SOW. Format this as YYYY-MM-DD.
7.  **SOW End Date**: The end date of the SOW. Format this as YYYY-MM-DD.
8.  **Billing Rates**: Identify the billing rate per resource. Include the rate for the current year and, if explicitly stated or clearly derivable from the document, the rates for the two preceding years. Provide this as an array of objects, each with 'year' and 'ratePerResource'.
9.  **Number of Resources**: The total number of resources allocated or specified in the SOW.

Return the extracted information as a JSON object strictly conforming to the provided output schema. If any information is not found, use appropriate placeholder values or omit if the schema allows (e.g., empty string for optional fields). Ensure dates are consistently formatted as YYYY-MM-DD.

Document: {{media url=documentDataUri}}`,
  model: 'googleai/gemini-2.5-flash',
});

const extractSOWDetailsFlow = ai.defineFlow(
  {
    name: 'extractSOWDetailsFlow',
    inputSchema: ExtractSOWDetailsInputSchema,
    outputSchema: ExtractSOWDetailsOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) {
      throw new Error('Failed to extract SOW details.');
    }
    return output;
  }
);

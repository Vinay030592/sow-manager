'use server';

import { extractSOWDetails, ExtractSOWDetailsInput, ExtractSOWDetailsOutput } from "@/ai/flows/extract-sow-details-flow";
import { generateBillingAnomalyExplanation, GenerateBillingAnomalyExplanationInput, GenerateBillingAnomalyExplanationOutput } from "@/ai/flows/generate-billing-anomaly-explanation-flow";

export async function handleSowExtraction(input: ExtractSOWDetailsInput): Promise<ExtractSOWDetailsOutput> {
  try {
    const output = await extractSOWDetails(input);
    return output;
  } catch (error) {
    console.error("Error in SOW extraction flow:", error);
    if (error instanceof Error) {
        throw new Error(`Failed to extract details from SOW document. Details: ${error.message}`);
    }
    throw new Error("Failed to extract details from SOW document.");
  }
}

export async function handleAnomalyDetection(input: GenerateBillingAnomalyExplanationInput): Promise<GenerateBillingAnomalyExplanationOutput> {
  try {
    const output = await generateBillingAnomalyExplanation(input);
    return output;
  } catch (error) {
    console.error("Error in billing anomaly detection flow:", error);
    if (error instanceof Error) {
        throw new Error(`Failed to analyze billing for anomalies. Details: ${error.message}`);
    }
    throw new Error("Failed to analyze billing for anomalies.");
  }
}

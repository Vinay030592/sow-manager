import { config } from 'dotenv';
config();

import '@/ai/flows/extract-sow-details-flow.ts';
import '@/ai/flows/generate-billing-anomaly-explanation-flow.ts';
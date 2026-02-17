import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';

export const ai = genkit({
  plugins: [googleAI({
    apiKey: 'AIzaSyCjaKfP6ukV3uz4f4L9RRaskvm-rIHd7Qc',
  })],
});

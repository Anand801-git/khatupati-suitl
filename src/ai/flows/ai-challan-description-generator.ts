'use server';
/**
 * @fileOverview This file implements a Genkit flow to automatically generate a professional and concise textual description of a design for a challan, based on design photos and job details.
 *
 * - aiChallanDescriptionGenerator - A function that handles the AI description generation process.
 * - AIChallanDescriptionGeneratorInput - The input type for the aiChallanDescriptionGenerator function.
 * - AIChallanDescriptionGeneratorOutput - The return type for the aiChallanDescriptionGenerator function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const AIChallanDescriptionGeneratorInputSchema = z.object({
  photoDataUris: z.array(z.string()).describe(
    "An array of design photos, each as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
  ),
  jobDetails: z.string().describe('Details about the job, such as design name, materials, and any specific instructions.'),
});
export type AIChallanDescriptionGeneratorInput = z.infer<typeof AIChallanDescriptionGeneratorInputSchema>;

const AIChallanDescriptionGeneratorOutputSchema = z.object({
  description: z.string().describe('A professional and concise textual description of the design, suitable for a challan.'),
});
export type AIChallanDescriptionGeneratorOutput = z.infer<typeof AIChallanDescriptionGeneratorOutputSchema>;

export async function aiChallanDescriptionGenerator(
  input: AIChallanDescriptionGeneratorInput
): Promise<AIChallanDescriptionGeneratorOutput> {
  return aiChallanDescriptionGeneratorFlow(input);
}

const prompt = ai.definePrompt({
  name: 'challanDescriptionPrompt',
  input: { schema: AIChallanDescriptionGeneratorInputSchema },
  output: { schema: AIChallanDescriptionGeneratorOutputSchema },
  prompt: `You are an expert in textile production documentation. Your task is to create a professional and concise textual description of a design based on the provided design photos and job details. This description will be used for a challan, so it should be clear, accurate, and easy to understand, highlighting key visual and functional aspects.

Job Details: {{{jobDetails}}}

Design Photos:
{{#each photoDataUris}}
  {{media url=this}}
{{/each}}

Generate the description based on the visual information and the provided details, ensuring it is suitable for formal documentation.`,
});

const aiChallanDescriptionGeneratorFlow = ai.defineFlow(
  {
    name: 'aiChallanDescriptionGeneratorFlow',
    inputSchema: AIChallanDescriptionGeneratorInputSchema,
    outputSchema: AIChallanDescriptionGeneratorOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) {
      throw new Error('Failed to generate challan description.');
    }
    return output;
  }
);

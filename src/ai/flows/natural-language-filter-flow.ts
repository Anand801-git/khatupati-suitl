
'use server';
/**
 * @fileOverview AI flow to filter production lots using natural language queries.
 * 
 * - naturalLanguageFilter - Handles interpreting user intent into lot filters.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const NaturalLanguageFilterInputSchema = z.object({
  query: z.string().describe('The natural language query from the user (e.g., "What is with the contractor?").'),
  lots: z.array(z.object({
    id: z.string(),
    name: z.string(),
    status: z.string(),
    vendorNames: z.array(z.string()),
  })).describe('A summary list of available lots to filter against.'),
});
export type NaturalLanguageFilterInput = z.infer<typeof NaturalLanguageFilterInputSchema>;

const NaturalLanguageFilterOutputSchema = z.object({
  matchingIds: z.array(z.string()).describe('The IDs of the lots that match the user query.'),
  explanation: z.string().describe('A brief explanation of why these lots were selected.'),
});
export type NaturalLanguageFilterOutput = z.infer<typeof NaturalLanguageFilterOutputSchema>;

export async function naturalLanguageFilter(input: NaturalLanguageFilterInput): Promise<NaturalLanguageFilterOutput> {
  return naturalLanguageFilterFlow(input);
}

const prompt = ai.definePrompt({
  name: 'naturalLanguageFilterPrompt',
  input: { 
    schema: z.object({
      query: z.string(),
      lotsContext: z.string()
    })
  },
  output: { schema: NaturalLanguageFilterOutputSchema },
  prompt: `You are an expert production assistant for a textile business. 
        Your task is to filter a list of production lots based on a natural language query.
        
        Context:
        - "Contractor" or "Vendor" or "Workshop" usually refers to lots that are "At Embroidery" or "At Value Addition".
        - "Finished" or "Ready to sell" refers to "Finished Stock".
        - "In the warehouse" or "Just bought" refers to "Purchased".
        
        Analyze the query and return the IDs of the lots that best match. 
        If the user mentions a specific vendor name, filter by those as well.
        
        Query: "{{{query}}}"
        Available Lots: {{{lotsContext}}}
        
        Return ONLY a JSON object matching the requested schema.`,
});

const naturalLanguageFilterFlow = ai.defineFlow(
  {
    name: 'naturalLanguageFilterFlow',
    inputSchema: NaturalLanguageFilterInputSchema,
    outputSchema: NaturalLanguageFilterOutputSchema,
  },
  async (input) => {
    const { output } = await prompt({
      query: input.query,
      lotsContext: JSON.stringify(input.lots)
    });

    if (!output) {
      throw new Error('AI failed to filter the lots.');
    }

    return output;
  }
);

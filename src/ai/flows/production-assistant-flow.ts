
'use server';
/**
 * @fileOverview AI assistant for production management.
 * Analyzes current lot and assignment data to provide operational insights.
 * 
 * - productionAssistant - Entry point for AI production queries.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const ProductionAssistantInputSchema = z.object({
  query: z.string().describe('The user question about production or inventory.'),
  context: z.string().describe('JSON stringified current state of lots and assignments.'),
});
export type ProductionAssistantInput = z.infer<typeof ProductionAssistantInputSchema>;

const ProductionAssistantOutputSchema = z.object({
  response: z.string().describe('A professional and concise response to the user query.'),
});
export type ProductionAssistantOutput = z.infer<typeof ProductionAssistantOutputSchema>;

export async function productionAssistant(input: ProductionAssistantInput): Promise<ProductionAssistantOutput> {
  return productionAssistantFlow(input);
}

const prompt = ai.definePrompt({
  name: 'productionAssistantPrompt',
  input: { schema: ProductionAssistantInputSchema },
  output: { schema: ProductionAssistantOutputSchema },
  prompt: `You are the Production Manager for Khatupati Suits. You have access to the COMPLETE and RICH production context of the business. 

Use the provided context to answer user queries with high precision. You can see every lot, every vendor assignment, historical costs, and current bottlenecks.

When asked about costs, refer to specific lots and their landing costs. 
When asked about vendors, mention their current workload, throughput, or delays.
When asked about stock, give exact numbers from the warehouse, embroidery, or VA stages.

Context Data:
{{{context}}}

Instructions:
- Be professional, data-driven, and concise.
- Always prefer specific numbers over general statements.
- If a user asks about "expensive" items, look at the 'topExpensiveLots' in summary.
- If asked about "delays", check the 'isDelayed' flag in assignments or 'delayedJobsCount'.
- Use the 'Surat Math' logic (which is already pre-calculated in 'landingCost') to explain costs if needed.
- If pieces are at a vendor, identify the vendor by name and mention how long they've had the pieces if relevant.

User Query: {{{query}}}`,
});

const productionAssistantFlow = ai.defineFlow(
  {
    name: 'productionAssistantFlow',
    inputSchema: ProductionAssistantInputSchema,
    outputSchema: ProductionAssistantOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) {
      throw new Error('AI failed to generate a response.');
    }
    return output;
  }
);

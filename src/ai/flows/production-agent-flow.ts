'use server';
/**
 * @fileOverview Autonomous AI Production Manager Agent.
 * Analyzes production context to generate alerts, cost warnings, and action plans.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const ProductionAgentInputSchema = z.object({
  context: z.string().describe('JSON stringified production context including lots, assignments, and summary stats.'),
});
export type ProductionAgentInput = z.infer<typeof ProductionAgentInputSchema>;

const ProductionAgentOutputSchema = z.object({
  urgentAlerts: z.array(z.object({
    vendorName: z.string(),
    lotName: z.string(),
    daysDelayed: z.number(),
    severity: z.enum(['High', 'Medium']),
  })).describe('List of significantly delayed jobs.'),
  costWarnings: z.array(z.object({
    lotName: z.string(),
    issue: z.string(),
    suggestedFix: z.string(),
  })).describe('Anomalies in fabric or processing costs.'),
  recommendedActions: z.array(z.object({
    priority: z.number(),
    action: z.string(),
    reason: z.string(),
  })).describe('Prioritized list of tasks for the production manager.'),
  dailySummary: z.string().describe('A concise paragraph summarizing the current floor status.'),
  whatsappDrafts: z.array(z.object({
    vendorName: z.string(),
    message: z.string(),
  })).describe('Draft follow-up messages for delayed vendors.'),
});
export type ProductionAgentOutput = z.infer<typeof ProductionAgentOutputSchema>;

export async function runProductionAgent(input: ProductionAgentInput): Promise<ProductionAgentOutput> {
  return productionAgentFlow(input);
}

const prompt = ai.definePrompt({
  name: 'productionAgentPrompt',
  input: { schema: ProductionAgentInputSchema },
  output: { schema: ProductionAgentOutputSchema },
  prompt: `You are the Autonomous Production Agent for Khatupati Suits. Your goal is to keep production moving efficiently.

Analyze the provided context data which contains all lots, vendor assignments, and summary metrics.

CONTEXT DATA:
{{{context}}}

Your tasks:
1. Identify "Urgent Alerts": Any job (assignment) that has been sent but not received for more than 15 days is an alert. Over 20 days is "High" severity.
2. Spot "Cost Warnings": Look for lots where the landing cost is significantly higher than others or if individual fabric rates look anomalous.
3. Generate "Recommended Actions": What should the manager do TODAY? (e.g., "Call Vendor X", "Move Lot Y to VA", "Check warehouse stock for Z").
4. Write a "Daily Summary": A professional overview of progress and bottlenecks.
5. Create "WhatsApp Drafts": For each vendor in the Urgent Alerts list, write a polite but firm follow-up message in English/Hinglish style typical of Surat textile markets.

Format your response as a structured JSON object matching the output schema.`,
});

const productionAgentFlow = ai.defineFlow(
  {
    name: 'productionAgentFlow',
    inputSchema: ProductionAgentInputSchema,
    outputSchema: ProductionAgentOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) {
      throw new Error('AI failed to generate production agent output.');
    }
    return output;
  }
);

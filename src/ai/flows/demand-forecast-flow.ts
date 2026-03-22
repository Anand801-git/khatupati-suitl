
'use server';
/**
 * @fileOverview AI Demand Forecasting agent for textile inventory planning.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const DemandForecastInputSchema = z.object({
  historicalPurchases: z.string().describe('JSON string of past purchase lots.'),
  currentMarketTrends: z.string().describe('JSON string of current identified market trends.'),
  horizon: z.number().describe('Forecast horizon in months (1, 3, or 6).'),
  budgetLimit: z.number().optional().describe('Maximum budget limit for the forecasted period.'),
});
export type DemandForecastInput = z.infer<typeof DemandForecastInputSchema>;

const DemandForecastOutputSchema = z.object({
  recommendations: z.array(z.object({
    quality: z.string().describe('Recommended fabric quality name.'),
    quantity: z.number().describe('Suggested number of pieces to buy.'),
    reason: z.string().describe('Business logic or trend-based reason for this recommendation.'),
    confidence: z.number().min(0).max(100).describe('Confidence score from 0-100.'),
  })).describe('Top purchase recommendations.'),
  designStyles: z.array(z.string()).describe('Top 5 design styles predicted to perform well.'),
  buyingCalendar: z.array(z.object({
    month: z.string().describe('Month name.'),
    action: z.string().describe('Primary buying or production action.'),
    priority: z.enum(['High', 'Medium', 'Low']),
  })).describe('Timeline for procurement.'),
  summary: z.string().describe('A concise high-level strategic summary of the forecast.'),
});
export type DemandForecastOutput = z.infer<typeof DemandForecastOutputSchema>;

export async function generateDemandForecast(input: DemandForecastInput): Promise<DemandForecastOutput> {
  return demandForecastFlow(input);
}

const prompt = ai.definePrompt({
  name: 'demandForecastPrompt',
  input: { schema: DemandForecastInputSchema },
  output: { schema: DemandForecastOutputSchema },
  prompt: `You are the Lead Strategist for Khatupati Suits, a premier suit manufacturer in Surat. 
Your goal is to predict inventory needs for the next {{{horizon}}} months.

CONTEXT:
- Historical Purchases: {{{historicalPurchases}}}
- Current Market Trends: {{{currentMarketTrends}}}
- Budget Constraints: {{#if budgetLimit}}₹{{{budgetLimit}}}{{else}}No strict limit{{/if}}

TASKS:
1. Analyze which fabric qualities (e.g., Silk, Cotton, Crepe) have been your best sellers vs current trending items.
2. Suggest exactly what to buy next to stay ahead of the Surat market.
3. Prioritize styles that match the upcoming season (Festive, Summer, or Wedding).
4. Create a specific buying calendar for the next {{{horizon}}} months.

Format your response as a professional JSON object. Be bold but data-driven.`,
});

const demandForecastFlow = ai.defineFlow(
  {
    name: 'demandForecastFlow',
    inputSchema: DemandForecastInputSchema,
    outputSchema: DemandForecastOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) {
      throw new Error('AI failed to generate demand forecast.');
    }
    return output;
  }
);

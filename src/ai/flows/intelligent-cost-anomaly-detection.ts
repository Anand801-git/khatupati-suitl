'use server';
/**
 * @fileOverview An AI agent for detecting cost anomalies in production data.
 *
 * - intelligentCostAnomalyDetection - A function that handles the cost anomaly detection process.
 * - IntelligentCostAnomalyDetectionInput - The input type for the intelligentCostAnomalyDetection function.
 * - IntelligentCostAnomalyDetectionOutput - The return type for the intelligentCostAnomalyDetection function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const IntelligentCostAnomalyDetectionInputSchema = z.object({
  historicalFabricRates: z.array(z.number()).describe('Historical fabric rates in USD per meter.'),
  historicalDyingCharges: z.array(z.number()).describe('Historical dying charges in USD per piece.'),
  historicalTotalLandingCosts: z.array(z.number()).describe('Historical total landing costs in USD per piece.'),
  currentFabricRate: z.number().describe('The current fabric rate to check for anomalies in USD per meter.'),
  currentDyingCharge: z.number().describe('The current dying charge to check for anomalies in USD per piece.'),
  currentTotalLandingCost: z.number().describe('The current total landing cost to check for anomalies in USD per piece.'),
  componentType: z.string().optional().describe('The type of component (e.g., Kurta, Salwar, Dupatta) for context.'),
  lotId: z.string().optional().describe('The ID of the current production lot for reference.'),
});
export type IntelligentCostAnomalyDetectionInput = z.infer<typeof IntelligentCostAnomalyDetectionInputSchema>;

const IntelligentCostAnomalyDetectionOutputSchema = z.object({
  isAnomaly: z.boolean().describe('True if an anomaly is detected, false otherwise.'),
  anomalyDetails: z.array(z.object({
    field: z.enum(['fabricRate', 'dyingCharge', 'totalLandingCost']).describe('The field where the anomaly was detected.'),
    currentValue: z.number().describe('The current value of the anomalous field.'),
    averageHistoricalValue: z.number().describe('The average historical value for the anomalous field.'),
    deviationPercentage: z.number().describe('The percentage deviation from the historical average.'),
    reason: z.string().describe('A brief explanation of why this is considered an anomaly.'),
  })).optional().describe('Details about the detected anomalies.'),
  overallMessage: z.string().describe('An overall message summarizing the anomaly detection.'),
});
export type IntelligentCostAnomalyDetectionOutput = z.infer<typeof IntelligentCostAnomalyDetectionOutputSchema>;

export async function intelligentCostAnomalyDetection(input: IntelligentCostAnomalyDetectionInput): Promise<IntelligentCostAnomalyDetectionOutput> {
  return intelligentCostAnomalyDetectionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'intelligentCostAnomalyDetectionPrompt',
  input: { schema: IntelligentCostAnomalyDetectionInputSchema },
  output: { schema: IntelligentCostAnomalyDetectionOutputSchema },
  prompt: `You are an intelligent anomaly detection system for production costs in a suit manufacturing business. Your task is to analyze current cost data against historical trends and identify any significant deviations that might indicate errors or unusual entries.

Here is the historical data for various cost categories:
- Historical Fabric Rates (per meter): {{{historicalFabricRates}}}
- Historical Dying Charges (per piece): {{{historicalDyingCharges}}}
- Historical Total Landing Costs (per piece): {{{historicalTotalLandingCosts}}}

Here is the current cost data you need to analyze:
- Current Fabric Rate (per meter): {{{currentFabricRate}}}
- Current Dying Charge (per piece): {{{currentDyingCharge}}}
- Current Total Landing Cost (per piece): {{{currentTotalLandingCost}}}

For context:
- Component Type: {{{componentType}}}
- Production Lot ID: {{{lotId}}}

Your analysis should focus on identifying values that are significantly outside the normal range based on the provided historical data. Consider a deviation of more than 20% from the historical average for a given cost category as a potential anomaly. If a field is anomalous, provide details including the field name, its current value, the calculated historical average, the deviation percentage, and a brief reason.

If no anomalies are detected, the 'isAnomaly' field should be false and the 'overallMessage' should reflect that.`,
});

const intelligentCostAnomalyDetectionFlow = ai.defineFlow(
  {
    name: 'intelligentCostAnomalyDetectionFlow',
    inputSchema: IntelligentCostAnomalyDetectionInputSchema,
    outputSchema: IntelligentCostAnomalyDetectionOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) {
      throw new Error('AI model did not return an output for anomaly detection.');
    }
    return output;
  }
);

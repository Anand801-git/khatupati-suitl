
'use server';
/**
 * @fileOverview AI Market Trend Analyser flow.
 * Researches and summarizes current textile and ethnic wear trends in Surat and beyond.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const MarketTrendInputSchema = z.object({
  query: z.string().optional().describe('Optional specific search query (e.g., "Cotton suits trends for summer 2024").'),
});
export type MarketTrendInput = z.infer<typeof MarketTrendInputSchema>;

const MarketTrendOutputSchema = z.object({
  trendingColors: z.array(z.object({
    name: z.string().describe('Name of the color (e.g., Peach Fuzz)'),
    hex: z.string().describe('Hex code for the color swatch')
  })).describe('Top 5 trending colors.'),
  designStyles: z.array(z.string()).describe('Top 5 design styles (e.g., Digital Floral, Gota Patti).'),
  fabricTypes: z.array(z.string()).describe('Top 5 fabric types currently in demand.'),
  recommendedPricePoints: z.string().describe('Recommended wholesale/retail price range for these trends.'),
  marketSummary: z.string().describe('A summary of current Surat market conditions and selling trends.'),
});
export type MarketTrendOutput = z.infer<typeof MarketTrendOutputSchema>;

export async function runMarketTrendAnalysis(input: MarketTrendInput): Promise<MarketTrendOutput> {
  return marketTrendFlow(input);
}

const prompt = ai.definePrompt({
  name: 'marketTrendPrompt',
  input: { schema: MarketTrendInputSchema },
  output: { schema: MarketTrendOutputSchema },
  prompt: `You are an expert textile market researcher specializing in the Indian ethnic wear and suits segment, particularly the Surat market.

Analyze the current fashion landscape based on the following query or general market knowledge:
Query: "{{{query}}}"

Your task is to provide:
1. Top 5 trending colors with their common names and accurate hex codes.
2. Top 5 design styles or motifs currently being sold heavily (e.g., Handwork, Digital Print, Foil work).
3. Top 5 fabric types that are currently trending (e.g., Jam Silk, Organza, Crepe).
4. Recommended price points for these styles in the medium-to-premium segment.
5. A concise but rich market summary of what is "hot" in the Surat textile markets (Ring Road, textile towers) right now.

Ensure the hex codes are valid and colors are visually distinct. Use industry-standard terminology for styles and fabrics.`,
});

const marketTrendFlow = ai.defineFlow(
  {
    name: 'marketTrendFlow',
    inputSchema: MarketTrendInputSchema,
    outputSchema: MarketTrendOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) {
      throw new Error('AI failed to generate market trend analysis.');
    }
    return output;
  }
);

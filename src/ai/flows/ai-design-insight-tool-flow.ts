
'use server';
/**
 * @fileOverview An AI tool to analyze design photos and suggest keywords, themes, and classifications.
 * 
 * - aiDesignInsightTool - Analyzes design visual data.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const AiDesignInsightToolInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A design photo, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  description: z
    .string()
    .optional()
    .describe('An optional textual description of the design.'),
});
export type AiDesignInsightToolInput = z.infer<typeof AiDesignInsightToolInputSchema>;

const AiDesignInsightToolOutputSchema = z.object({
  keywords: z
    .array(z.string())
    .describe('A list of relevant keywords describing the design.'),
  themes: z
    .array(z.string())
    .describe('A list of overarching themes present in the design.'),
  classification: z
    .string()
    .describe('A high-level classification (e.g., Floral, Geometric, Abstract).'),
  summary: z.string().describe('A concise summary of the design.'),
});
export type AiDesignInsightToolOutput = z.infer<typeof AiDesignInsightToolOutputSchema>;

export async function aiDesignInsightTool(input: AiDesignInsightToolInput): Promise<AiDesignInsightToolOutput> {
  return aiDesignInsightToolFlow(input);
}

const prompt = ai.definePrompt({
  name: 'designInsightPrompt',
  input: { schema: AiDesignInsightToolInputSchema },
  output: { schema: AiDesignInsightToolOutputSchema },
  prompt: `Analyze the provided design image and extract keywords, themes, and a classification. Use any provided description for additional context.

Description: {{{description}}}
Design Photo: {{media url=photoDataUri}}`,
});

const aiDesignInsightToolFlow = ai.defineFlow(
  {
    name: 'aiDesignInsightToolFlow',
    inputSchema: AiDesignInsightToolInputSchema,
    outputSchema: AiDesignInsightToolOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);

    if (!output) {
      throw new Error('AI did not return a valid output for design insight.');
    }
    return output;
  }
);

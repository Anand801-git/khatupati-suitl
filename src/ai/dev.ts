import { config } from 'dotenv';
config();

async function loadFlow(path: string) {
  try {
    await import(path);
  } catch (error) {
    console.warn(`[AI-DEV] Failed to load flow: ${path}`,
      (error as Error).message
    );
  }
}

if (process.env.NODE_ENV === 'development') {
  const flows = [
    '@/ai/flows/ai-challan-description-generator.ts',
    '@/ai/flows/intelligent-cost-anomaly-detection.ts',
    '@/ai/flows/ai-design-insight-tool-flow.ts',
    '@/ai/flows/natural-language-filter-flow.ts',
    '@/ai/flows/production-assistant-flow.ts',
    '@/ai/flows/production-agent-flow.ts',
    '@/ai/flows/market-trend-flow.ts',
    '@/ai/flows/demand-forecast-flow.ts',
  ];

  Promise.all(flows.map(loadFlow));
}
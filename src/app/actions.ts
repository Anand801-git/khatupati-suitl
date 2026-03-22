
'use server';

export async function handleProductionAssistant(input: { query: string; context: string }) {
  try {
    const { productionAssistant } = await import('@/ai/flows/production-assistant-flow');
    return productionAssistant(input);
  } catch (error) {
    console.error("handleProductionAssistant failed:", error);
    throw new Error("Failed to run production assistant");
  }
}

export async function handleProductionAgent(input: { context:string }) {
  try {
    const { runProductionAgent } = await import('@/ai/flows/production-agent-flow');
    return runProductionAgent(input);
  } catch (error) {
    console.error("handleProductionAgent failed:", error);
    throw new Error("Failed to run production agent");
  }
}

export async function handleMarketTrend(input: { query?: string }) {
  try {
    const { runMarketTrendAnalysis } = await import('@/ai/flows/market-trend-flow');
    return runMarketTrendAnalysis(input);
  } catch (error) {
    console.error("handleMarketTrend failed:", error);
    throw new Error("Failed to run market trend analysis");
  }
}

export async function handleDemandForecast(input: { historicalPurchases: string; currentMarketTrends: string; horizon: number; budgetLimit?: number }) {
  try {
    const { generateDemandForecast } = await import('@/ai/flows/demand-forecast-flow');
    return generateDemandForecast(input);
  } catch (error) {
    console.error("handleDemandForecast failed:", error);
    throw new Error("Failed to generate demand forecast");
  }
}

export async function handleAiDesignInsight(input: { photoDataUri: string; description?: string }) {
  try {
    const { aiDesignInsightTool } = await import('@/ai/flows/ai-design-insight-tool-flow');
    return aiDesignInsightTool(input);
  } catch (error) {
    console.error("handleAiDesignInsight failed:", error);
    throw new Error("Failed to run AI design insight");
  }
}

export async function handleNaturalLanguageFilter(input: { query: string; lots: { id: string; name: string; status: string; vendorNames: string[] }[] }) {
  try {
    const { naturalLanguageFilter } = await import('@/ai/flows/natural-language-filter-flow');
    return naturalLanguageFilter(input);
  } catch (error) {
    console.error("handleNaturalLanguageFilter failed:", error);
    throw new Error("Failed to apply natural language filter");
  }
}

export async function handleChallanDescription(input: { photoDataUris: string[]; jobDetails: string }) {
  try {
    const { aiChallanDescriptionGenerator } = await import('@/ai/flows/ai-challan-description-generator');
    return aiChallanDescriptionGenerator(input);
  } catch (error) {
    console.error("handleChallanDescription failed:", error);
    throw new Error("Failed to generate challan description");
  }
}

export async function handleCostAnomalyDetection(input: { 
  historicalFabricRates: number[];
  historicalDyingCharges: number[];
  historicalTotalLandingCosts: number[];
  currentFabricRate: number;
  currentDyingCharge: number;
  currentTotalLandingCost: number;
  componentType?: string;
  lotId?: string;
}) {
  try {
    const { intelligentCostAnomalyDetection } = await import('@/ai/flows/intelligent-cost-anomaly-detection');
    return intelligentCostAnomalyDetection(input);
  } catch (error) {
    console.error("handleCostAnomalyDetection failed:", error);
    throw new Error("Failed to run cost anomaly detection");
  }
}

export async function handleCostAnomalyCheck(input: { 
  historicalFabricRates: number[];
  historicalDyingCharges: number[];
  historicalTotalLandingCosts: number[];
  currentFabricRate: number;
  currentDyingCharge: number;
  currentTotalLandingCost: number;
  componentType?: string;
  lotId?: string;
}) {
  try {
    const { intelligentCostAnomalyDetection } = await import('@/ai/flows/intelligent-cost-anomaly-detection');
    return intelligentCostAnomalyDetection(input);
  } catch (error) {
    console.error("handleCostAnomalyCheck failed:", error);
    throw new Error("Failed to run cost anomaly check");
  }
}

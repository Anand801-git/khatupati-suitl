
/**
 * AI Server Actions - Refactored for Static Export
 * 
 * IMPORTANT: Next.js 'output: export' does not support 'use server' actions.
 * To enable these features in the mobile app, they should be moved to a 
 * separate hosted API endpoint.
 */

export async function handleProductionAssistant(input: { query: string; context: string }) {
  console.warn("AI Production Assistant called in static mode.");
  throw new Error("AI Assistant requires an active server. Please check your connection.");
}

export async function handleProductionAgent(input: { context:string }) {
  throw new Error("AI Agent requires an active server.");
}

export async function handleMarketTrend(input: { query?: string }) {
  throw new Error("Market Trend analysis requires an active server.");
}

export async function handleDemandForecast(input: { historicalPurchases: string; currentMarketTrends: string; horizon: number; budgetLimit?: number }) {
  throw new Error("Demand Forecast requires an active server.");
}

export async function handleAiDesignInsight(input: { photoDataUri: string; description?: string }) {
  console.warn("AI Design Insight called in static mode.");
  throw new Error("AI Design Analysis requires an active server.");
}

export async function handleNaturalLanguageFilter(input: { query: string; lots: { id: string; name: string; status: string; vendorNames: string[] }[] }) {
  // We can implement a basic client-side filter fallback here if needed.
  throw new Error("Natural Language filtering requires an active server.");
}

export async function handleChallanDescription(input: { photoDataUris: string[]; jobDetails: string }) {
  throw new Error("AI Challan Generation requires an active server.");
}

export async function handleCostAnomalyDetection(input: any) {
  throw new Error("Cost Anomaly Detection requires an active server.");
}

export async function handleCostAnomalyCheck(input: any) {
  throw new Error("Cost Anomaly Check requires an active server.");
}

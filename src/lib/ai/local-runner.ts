import { CreateMLCEngine, MLCEngine, InitProgressCallback } from "@mlc-ai/web-llm";

// Use a smaller model like Phi-3-mini to fit on most mobile devices (NPU/GPU)
const MODEL_ID = "Phi-3-mini-4k-instruct-q4f16_1-MLC";

let engine: MLCEngine | null = null;
let isInitializing = false;

export async function initLocalAI(onProgress?: InitProgressCallback): Promise<MLCEngine> {
  if (engine) return engine;
  if (isInitializing) {
    // Basic polling wait if already initializing
    while (isInitializing) {
      await new Promise(r => setTimeout(r, 500));
    }
    if (engine) return engine;
  }

  try {
    isInitializing = true;
    engine = await CreateMLCEngine(
      MODEL_ID, 
      { initProgressCallback: onProgress || console.log }
    );
    return engine;
  } catch (err) {
    console.error("Failed to initialize WebLLM engine:", err);
    throw err;
  } finally {
    isInitializing = false;
  }
}

export async function askLocalAI(systemContext: string, userQuery: string, imageUri?: string, onProgress?: InitProgressCallback): Promise<string> {
  const llmEngine = await initLocalAI(onProgress);
  
  const userContent: any[] = [{ type: "text", text: userQuery }];
  
  if (imageUri) {
    userContent.push({ type: "image_url", image_url: { url: imageUri } });
  }

  const messages = [
    { role: "system" as const, content: "You are an AI assistant for Khatupati Suits, a production management company in Surat. Reply concisely based on the context provided. Context: " + systemContext },
    { role: "user" as const, content: userContent }
  ];

  const reply = await llmEngine.chat.completions.create({
    messages,
    temperature: 0.2,
  });

  return reply.choices[0].message.content || "No response generated.";
}

import { GenerateContentResult, GenerativeModel } from "@google/generative-ai";

/**
 * A robust wrapper for Gemini API calls that implements exponential backoff.
 * This ensures that if Google's servers return a 503 (High Demand) or 429 (Rate Limit),
 * the app will automatically wait and retry instead of crashing during a presentation.
 */
export async function generateContentWithRetry(
  model: GenerativeModel,
  prompt: string,
  maxRetries = 3
): Promise<GenerateContentResult> {
  let attempt = 0;
  
  while (attempt < maxRetries) {
    try {
      return await model.generateContent(prompt);
    } catch (error: any) {
      attempt++;
      
      const isRateLimitOrOverload = 
        error?.message?.includes("503") || 
        error?.message?.includes("429") || 
        error?.message?.includes("High demand") ||
        error?.message?.includes("fetch failed");

      if (isRateLimitOrOverload && attempt < maxRetries) {
        // Exponential backoff: 1.5s, 3s, 6s...
        const waitTime = Math.pow(2, attempt - 1) * 1500;
        console.warn(`[Gemini API] 503/429 encountered. Retrying attempt ${attempt} in ${waitTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      } else {
        // If it's a structural error (like 400 Bad Request) or we're out of retries, throw
        throw error;
      }
    }
  }
  
  throw new Error("Failed to generate content after maximum retries.");
}

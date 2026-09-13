import { GoogleGenerativeAI } from "@google/generative-ai";
import type { ProductProfile } from "./types";

export async function generateEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "your_key_here") {
    throw new Error("Missing GEMINI_API_KEY in .env.local.");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-embedding-001" });
  const result = await model.embedContent({
    content: { parts: [{ text }] },
    outputDimensionality: 768,
  } as any);

  if (!result.embedding || !result.embedding.values) {
    throw new Error("Gemini embedding model returned no vector values.");
  }

  return result.embedding.values;
}

export function buildEmbeddingInput(profile: Partial<ProductProfile>): string {
  const parts = [
    profile.productName ? `Product: ${profile.productName}` : "",
    profile.category ? `Category: ${profile.category}${profile.subcategory ? ` (${profile.subcategory})` : ""}` : "",
    profile.priceINR ? `Price: ₹${profile.priceINR}${profile.packSize ? ` per ${profile.packSize}` : ""}` : "",
    profile.needsColdChain !== undefined ? `Cold chain: ${profile.needsColdChain ? "Required" : "Not required"}` : "",
    profile.shelfLifeDays ? `Shelf life: ${profile.shelfLifeDays} days` : "",
    profile.targetCustomer ? `Target customer: ${profile.targetCustomer}` : "",
    profile.incomeTarget ? `Income target: ${profile.incomeTarget}` : ""
  ].filter(Boolean);

  return parts.join("\n");
}

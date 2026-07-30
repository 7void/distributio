import { GoogleGenerativeAI } from "@google/generative-ai";
import type { ProductProfile } from "./types";

export async function generateEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "your_key_here") {
    throw new Error("Missing GEMINI_API_KEY in .env.local.");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "text-embedding-004" });
  const result = await model.embedContent(text);

  if (!result.embedding || !result.embedding.values) {
    throw new Error("Gemini embedding model returned no vector values.");
  }

  return result.embedding.values;
}

export function buildEmbeddingInput(profile: ProductProfile): string {
  const parts = [
    `Product: ${profile.productName}`,
    `Category: ${profile.category}${profile.subcategory ? ` (${profile.subcategory})` : ""}`,
    `Price: ₹${profile.priceINR}${profile.packSize ? ` per ${profile.packSize}` : ""}`,
    `Cold chain: ${profile.needsColdChain ? "Required" : "Not required"}`,
    profile.shelfLifeDays ? `Shelf life: ${profile.shelfLifeDays} days` : "",
    `Target customer: ${profile.targetCustomer}`,
    `Income target: ${profile.incomeTarget}`
  ].filter(Boolean);

  return parts.join("\n");
}

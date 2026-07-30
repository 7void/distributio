import { GoogleGenerativeAI } from "@google/generative-ai";
import type { ExtractedFeatures, ScoredCity } from "@/lib/types";
import { createAnalysis } from "@/db/queries";
import { getOrSet, generateCacheKey } from "@/lib/cache";
import { generateEmbedding } from "@/lib/embeddings";

interface MemoPayload {
  features: ExtractedFeatures;
  scores: ScoredCity[];
  prompt?: string;
}

function isMemoPayload(payload: unknown): payload is MemoPayload {
  return (
    typeof payload === "object" &&
    payload !== null &&
    "features" in payload &&
    "scores" in payload &&
    typeof payload.features === "object" &&
    Array.isArray(payload.scores)
  );
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-IN").format(value);
}

function buildMemoPrompt(features: ExtractedFeatures, scores: ScoredCity[]) {
  const topFive = scores
    .slice(0, 5)
    .map(
      (city) =>
        `${city.name} (score ${city.score}/100, ~${formatNumber(
          city.demand
        )} units/month, ${city.band})`
    )
    .join("\n");

  return `You are distribut.io, an AI distribution intelligence platform for India.
Product: ${features.productName} — ${features.category}, ₹${features.priceINR} (${features.priceSegment})
Target: ${features.targetAudience}
Channels: ${features.channels.join(", ")}
Cold chain required: ${features.needsColdChain}
Distribution approach: Level ${features.distributionLevel}, ${features.distributionType}, via ${features.distributorProfile}

Top 5 markets by score:
${topFive}

Write a sharp 4-paragraph distribution strategy memo in plain prose.
No headers, no bullets. Cover:
1. Why these specific cities rank highest for this product
2. Recommended channel mix and which to lead with
3. Which 2 cities to enter first and exact sequencing rationale
4. One key risk and specific mitigation
Cite city names. Be specific. Under 220 words. Sound like a McKinsey analyst, not a chatbot.`;
}

export async function POST(request: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey || apiKey === "your_key_here") {
      throw new Error("Missing GEMINI_API_KEY in .env.local.");
    }

    const payload = await request.json();

    if (!isMemoPayload(payload)) {
      return Response.json(
        { message: "features and scores are required." },
        { status: 400 }
      );
    }

    const memoPrompt = buildMemoPrompt(payload.features, payload.scores);
    const cacheKey = generateCacheKey("memo", memoPrompt);
    const TWENTY_FOUR_HOURS_IN_SECONDS = 24 * 60 * 60;

    const memo = await getOrSet<string>(
      cacheKey,
      TWENTY_FOUR_HOURS_IN_SECONDS,
      async () => {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const result = await model.generateContent(memoPrompt);
        return result.response.text().trim();
      }
    );

    // Persist analysis in the database asynchronously in the background
    const prompt = payload.prompt || `${payload.features.productName} — ${payload.features.category} at ₹${payload.features.priceINR}`;
    
    (async () => {
      let embedding: number[] | undefined;
      if (process.env.PGVECTOR_DISABLED !== "true") {
        try {
          const embedText = `Product: ${payload.features.productName}\nCategory: ${payload.features.category}\nPrice: ₹${payload.features.priceINR}\nCold chain: ${payload.features.needsColdChain ? "Required" : "Not required"}\nTarget customer: ${payload.features.targetAudience}`;
          embedding = await generateEmbedding(embedText);
        } catch (err) {
          console.error("[PGVECTOR] Failed to generate embedding for analysis persistence:", err);
        }
      }
      await createAnalysis(prompt, payload.features, memo, "gemini-2.5-flash", embedding);
    })().catch((err) => {
      console.error("Failed to persist analysis to database:", err);
    });

    return Response.json({ memo });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Strategy memo failed.";

    return Response.json({ message }, { status: 500 });
  }
}


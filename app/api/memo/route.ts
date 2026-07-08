import { GoogleGenerativeAI } from "@google/generative-ai";
import type { ExtractedFeatures, ScoredCity } from "@/lib/types";

interface MemoPayload {
  features: ExtractedFeatures;
  scores: ScoredCity[];
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

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent(
      buildMemoPrompt(payload.features, payload.scores)
    );

    return Response.json({ memo: result.response.text().trim() });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Strategy memo failed.";

    return Response.json({ message }, { status: 500 });
  }
}

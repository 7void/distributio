import { GoogleGenerativeAI, Schema, SchemaType } from "@google/generative-ai";
import type { ExtractedFeatures, ScoredCity } from "@/lib/types";

interface Payload {
  features: ExtractedFeatures;
  scores: ScoredCity[];
}

const channelMixSchema: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    recommended_channels: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          channel: { type: SchemaType.STRING },
          priority: { type: SchemaType.NUMBER },
          fit_score: { type: SchemaType.NUMBER },
          reason: { type: SchemaType.STRING },
          cities: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING },
          },
        },
        required: ["channel", "priority", "fit_score", "reason", "cities"],
      },
    },
    channel_split_pct: {
      type: SchemaType.ARRAY,
      description: "Array of channel percentage splits adding up to 100",
      items: {
        type: SchemaType.OBJECT,
        properties: {
          channel: { type: SchemaType.STRING },
          pct: { type: SchemaType.NUMBER },
        },
        required: ["channel", "pct"],
      },
    },
    lead_channel: { type: SchemaType.STRING },
    lead_channel_reason: { type: SchemaType.STRING },
  },
  required: [
    "recommended_channels",
    "channel_split_pct",
    "lead_channel",
    "lead_channel_reason",
  ],
};

function buildPrompt(features: ExtractedFeatures, scores: ScoredCity[]) {
  const topCities = scores
    .slice(0, 5)
    .map((c) => `${c.name} (Score: ${c.score}/100, Tier: ${c.tier})`)
    .join("\n");

  return `You are distribut.io's AI channel strategist.
Product: ${features.productName} — ${features.category}, ₹${features.priceINR} (${features.priceSegment})
Target Audience: ${features.targetAudience}
Cold chain required: ${features.needsColdChain}
Distribution approach: Level ${features.distributionLevel}, ${features.distributionType}
Selected Channels: ${features.channels.join(", ")}

Top 5 markets by score:
${topCities}

Analyze the product and the top markets. Return a JSON object with the recommended channel mix strategy according to the schema.`;
}

export async function POST(request: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "your_key_here") {
      throw new Error("Missing GEMINI_API_KEY");
    }

    const payload = (await request.json()) as Payload;

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: channelMixSchema,
      },
    });

    const result = await model.generateContent(buildPrompt(payload.features, payload.scores));
    return new Response(result.response.text(), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate channel mix.";
    return Response.json({ message }, { status: 500 });
  }
}

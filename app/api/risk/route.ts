import { GoogleGenerativeAI, Schema, SchemaType } from "@google/generative-ai";
import type { ExtractedFeatures, ScoredCity } from "@/lib/types";

interface Payload {
  features: ExtractedFeatures;
  scores: ScoredCity[];
}

const riskSchema: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    risk_score: { type: SchemaType.NUMBER },
    risks: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          category: { type: SchemaType.STRING },
          severity: { type: SchemaType.STRING, description: "'high', 'medium', or 'low'" },
          likelihood: { type: SchemaType.STRING, description: "'high', 'medium', or 'low'" },
          description: { type: SchemaType.STRING },
          mitigation: { type: SchemaType.STRING },
        },
        required: ["category", "severity", "likelihood", "description", "mitigation"],
      },
    },
    launch_probability: { type: SchemaType.NUMBER },
    go_nogo: { type: SchemaType.STRING, description: "'go', 'go_with_caution', or 'nogo'" },
  },
  required: ["risk_score", "risks", "launch_probability", "go_nogo"],
};

function buildPrompt(features: ExtractedFeatures, scores: ScoredCity[]) {
  const topCities = scores
    .slice(0, 5)
    .map((c) => `${c.name} (Margin/Unit: ₹${c.marginPerUnit}, Break-even units: ${c.breakEvenUnits}, Confidence: ${c.confidenceLevel})`)
    .join("\n");

  return `You are distribut.io's AI risk analyst.
Product: ${features.productName} — ${features.category}, ₹${features.priceINR} (${features.priceSegment})
Cold chain required: ${features.needsColdChain}
Distribution approach: Level ${features.distributionLevel}, ${features.distributionType}
Selected Channels: ${features.channels.join(", ")}

Top 5 markets and their unit economics:
${topCities}

Analyze the product distribution plan and output a structured JSON risk register. Highlight risks like logistics cost eating margins, cold chain failures, or mismatch with target audience.`;
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
        responseSchema: riskSchema,
      },
    });

    const result = await model.generateContent(buildPrompt(payload.features, payload.scores));
    return new Response(result.response.text(), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate risk register.";
    return Response.json({ message }, { status: 500 });
  }
}

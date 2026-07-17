import { GoogleGenerativeAI, Schema, SchemaType } from "@google/generative-ai";
import type { ExtractedFeatures, ProductProfile, ScoredCity } from "@/lib/types";

interface Payload {
  features: ExtractedFeatures;
  scores: ScoredCity[];
  profile?: ProductProfile;
}

const gtmSchema: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    top_markets: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
    },
    launch_sequence: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          phase: { type: SchemaType.NUMBER },
          city: { type: SchemaType.STRING },
          week: { type: SchemaType.STRING },
          action: { type: SchemaType.STRING },
        },
        required: ["phase", "city", "week", "action"],
      },
    },
    recommended_strategy: { type: SchemaType.STRING },
    first_move: { type: SchemaType.STRING },
  },
  required: ["top_markets", "launch_sequence", "recommended_strategy", "first_move"],
};

function buildPrompt(features: ExtractedFeatures, scores: ScoredCity[], profile?: ProductProfile) {
  const topCities = scores
    .slice(0, 5)
    .map((c) => `${c.name} (Score: ${c.score}/100, Band: ${c.band}, Confidence: ${c.confidenceLevel}, Margin/unit: ₹${c.marginPerUnit}, Break-even: ${c.breakEvenUnits} units)`)
    .join("\n");

  // ISSUE-3 FIX: derive a max-cities-in-phase-1 cap from production capacity
  const capacityStr = profile?.monthlyCapacityUnits ?? "";
  let maxCitiesPhase1 = 3; // default
  if (capacityStr.includes("Under 1,000"))           maxCitiesPhase1 = 1;
  else if (capacityStr.includes("1,000 – 10,000"))   maxCitiesPhase1 = 2;
  else if (capacityStr.includes("10,000 – 1L"))      maxCitiesPhase1 = 3;
  else if (capacityStr.includes("1L – 10L"))         maxCitiesPhase1 = 4;
  else if (capacityStr.includes("Above 10L"))        maxCitiesPhase1 = 5;

  const regionNote = profile?.preferredRegion === "specific" && profile?.specificRegion
    ? `Target region: ${profile.specificRegion} (cities outside this region have already been filtered out).`
    : "";

  const brandInfo = profile ? `
Brand: ${profile.brandName} (${profile.brandMaturity} brand)
Monthly production capacity: ${profile.monthlyCapacityUnits || "Not specified"}
Launch budget: ${profile.launchBudgetINR}
Launch timeline: ${profile.launchTimeline === "1month" ? "Urgent — within 1 month" : profile.launchTimeline === "1quarter" ? "This quarter (2-3 months)" : "Next 6 months"}
Distributor status: ${profile.hasDistributor === "yes" ? "Distributors already onboarded" : profile.hasDistributor === "no" ? "Actively looking for distributors" : "Going direct — D2C model, no intermediary"}
Warehouse: ${profile.warehouseCity}
Max delivery radius: ${profile.deliveryRadiusKM} km
Primary goal: ${profile.primaryGoal}
${regionNote}` : "";

  return `You are distribut.io's AI Go-To-Market (GTM) planner.
Product: ${features.productName} — ${features.category}, ₹${features.priceINR} (${features.priceSegment})
Selected Channels: ${features.channels.join(", ")}
${brandInfo}

Top 5 markets evaluated:
${topCities}

Develop a phased GTM launch sequence in JSON format.
Constraints to respect:
- Phase 1 must include AT MOST ${maxCitiesPhase1} city/cities — capacity is limited to ${capacityStr || "unknown"} per month.
- A "new" brand with a small budget should start with 1-2 cities maximum in Phase 1.
- An "established" brand can enter 3-5 cities simultaneously IF capacity allows.
- If distributor status is "no", factor in 2-4 weeks for distributor recruitment before market activation.
- If distributor status is "direct" (D2C), skip distributor recruitment time but note digital marketing setup.
- Sequence cities by confidence level first, then score. High-confidence cities go first.
- Match the timeline to the user's stated launch timeline (urgent = compress phases, 6-month = spread phases).
- Consider warehouse proximity: closer cities are cheaper and faster to activate.`;
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
        responseSchema: gtmSchema,
      },
    });

    const result = await model.generateContent(buildPrompt(payload.features, payload.scores, payload.profile));
    return new Response(result.response.text(), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate GTM plan.";
    return Response.json({ message }, { status: 500 });
  }
}

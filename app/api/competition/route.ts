import { GoogleGenerativeAI } from "@google/generative-ai";
import type { CompetitionIntelligence, ExtractedFeatures, ProductProfile } from "@/lib/types";
import { generateContentWithRetry } from "@/lib/gemini-retry";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// ─── System prompt ─────────────────────────────────────────────────────────────

const systemPrompt = `You are a market intelligence analyst specialising in Indian consumer goods competitive landscapes.

You will receive a product profile and must return a structured competitive analysis grounded in established frameworks:

FRAMEWORKS TO APPLY:
1. Herfindahl-Hirschman Index (HHI): Sum of squared market shares. HHI < 1500 = low concentration, 1500-2500 = medium, > 2500 = high.
2. Porter's Five Forces (1980) — Competitive Rivalry dimension: factor in number of players, category growth rate, product differentiation, switching costs.
3. BCG Category Attractiveness: market growth vs. relative competitive position at this specific price point.

CRITICAL RULE — Price-Point Sub-Segmentation:
Do NOT analyse competition at the category level alone. Analyse competition within the specific PRICE TIER of the product.
Example: A ₹200 biscuit does NOT compete with Parle-G (₹5-20 segment). It competes with premium-health biscuit brands like Yoga Bar, Slurrp Farm, or Nourish Organics.
A ₹50 energy drink does NOT compete with Red Bull (₹150+). It competes with Sting, Recharged, etc.

OUTPUT SCHEMA (return ONLY valid JSON, no markdown, no explanation):
{
  "hhi_estimate": number (0-10000, estimated from top-5 competitor shares squared and summed),
  "market_concentration": "low" | "medium" | "high",
  "top_competitors": [
    { "name": string, "estimated_share_pct": number }
  ],
  "entry_barrier": "low" | "medium" | "high",
  "competition_penalty": {
    "tier1": number (0-15, points to deduct from Tier-1 metro scores),
    "tier2": number (0-8, points to deduct from Tier-2 city scores),
    "tier3": number (0-4, points to deduct from Tier-3 city scores)
  },
  "reasoning": string (2-3 sentences explaining the competitive landscape at this specific price point, naming the key players and why metros are harder/easier to enter)
}

PENALTY CALIBRATION GUIDE:
- Tier-1 metros attract ALL brands simultaneously — they are the most competitively saturated.
- Tier-2/3 cities have lower brand penetration — more shelf space for new entrants.
- Greenfield / no established players → penalty: tier1=0, tier2=0, tier3=0
- Low competition (1-2 niche players) → tier1=2-3, tier2=0-1, tier3=0
- Medium competition (3-5 players) → tier1=4-6, tier2=2-3, tier3=0-1
- High competition (5+ strong brands) → tier1=8-12, tier2=4-6, tier3=1-3
- Extreme (near-monopoly like Parle-G in ₹5 biscuits) → tier1=13-15, tier2=7-8, tier3=3-4

IMPORTANT: Only include top 3-5 competitors. Estimated_share_pct values should be realistic and sum to less than 100 (leaving room for fragmented smaller players).`;

export async function POST(req: Request) {
  try {
    const body = await req.json() as {
      features: ExtractedFeatures;
      profile: ProductProfile;
    };

    const { features, profile } = body;

    const userPrompt = `Analyse the competitive landscape for this product:

Product: ${profile.productName}
Category: ${profile.category} > ${profile.subcategory}
Price: ₹${profile.priceINR} per ${profile.packSize}
Price Segment (AI-classified): ${features.priceSegment}
Target Customer: ${profile.targetCustomer}
Income Target: ${profile.incomeTarget} (mass = bottom 40%, mid = middle 40%, premium = top 20%)
Brand Maturity: ${profile.brandMaturity}
Distribution Channels: ${profile.preferredChannels.join(", ")}
Named Competitors (user-provided, use as hints): ${profile.competitors || "none specified"}
Key Product Insight: ${features.keyInsight}

Evaluate competition specifically within the ₹${profile.priceINR} price tier of ${profile.subcategory} in the Indian market.
Return ONLY the JSON object as specified.`;

    // Initialize the API using the existing GEMINI_API_KEY from environment
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const modelName = process.env.GEMINI_MODEL || "gemini-1.5-flash";
    const model = genAI.getGenerativeModel({
      model: modelName,
      systemInstruction: systemPrompt,
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 2000,
        responseMimeType: "application/json",
      },
    });

    const result = await generateContentWithRetry(model, userPrompt);
    const raw = result.response.text().trim();

    // Parse and validate the response
    let parsed: CompetitionIntelligence;
    try {
      // In case Gemini returns markdown blocks despite responseMimeType
      const trimmed = raw.trim();
      const start = trimmed.indexOf("{");
      const end = trimmed.lastIndexOf("}");
      parsed = JSON.parse(start !== -1 && end !== -1 ? trimmed.slice(start, end + 1) : trimmed) as CompetitionIntelligence;
    } catch (e) {
      throw new Error("Failed to parse competition JSON: " + e);
    }

    // Safely Clamp penalties to safe bounds, avoiding undefined errors
    if (!parsed.competition_penalty) {
      parsed.competition_penalty = { tier1: 5, tier2: 2, tier3: 0 };
    }
    parsed.competition_penalty.tier1 = Math.max(0, Math.min(15, parsed.competition_penalty.tier1 ?? 5));
    parsed.competition_penalty.tier2 = Math.max(0, Math.min(8,  parsed.competition_penalty.tier2 ?? 2));
    parsed.competition_penalty.tier3 = Math.max(0, Math.min(4,  parsed.competition_penalty.tier3 ?? 0));

    return Response.json(parsed);
  } catch (error) {
    console.error("[/api/competition] error:", error);
    // Return a neutral default so the pipeline never blocks
    const fallback: CompetitionIntelligence = {
      hhi_estimate: 1500,
      market_concentration: "medium",
      top_competitors: [],
      entry_barrier: "medium",
      competition_penalty: { tier1: 5, tier2: 2, tier3: 0 },
      reasoning: "Competition analysis unavailable. Medium competition assumed."
    };
    return Response.json(fallback);
  }
}

import { GoogleGenerativeAI } from "@google/generative-ai";
import type { City, CityEnrichment } from "./types";

function parseJson(text: string): any {
  const trimmed = text.trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Gemini did not return a JSON object.");
  }

  return JSON.parse(trimmed.slice(start, end + 1));
}

const emptyEnrichment = (): CityEnrichment => ({
  developments: [],
  scoreAdjustments: {
    retail: 0,
    cold: 0,
    income: 0,
    internet: 0
  },
  competitorMentions: null
});

export async function enrichCity(city: City, signal: string): Promise<CityEnrichment> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "your_key_here") {
    console.error("[ENRICH] Missing GEMINI_API_KEY");
    return emptyEnrichment();
  }

  const prompt = `You are a market intelligence analyst for India. 
Given a news signal about a city, extract structured enrichment data.

City: ${city.name}, ${city.state}
Signal: ${signal}

Return ONLY valid JSON, no explanation, no markdown:
{
  "developments": [{
    "type": "retail_expansion" or "infrastructure" or "economic" or "competitor",
    "description": "one sentence summary",
    "impact": "income" or "retail" or "internet" or "cold" or "competitor",
    "direction": "positive" or "negative",
    "magnitude": 1-5,
    "date": "YYYY-MM format",
    "source": "publication name or unknown"
  }],
  "scoreAdjustments": {
    "retail": integer -5 to +5,
    "cold": integer -5 to +5,
    "income": integer -5 to +5,
    "internet": integer -5 to +5
  },
  "competitorMentions": {
    "category": "category key string",
    "brands": ["brand names"],
    "saturation": "low" or "medium" or "high"
  } or null
}

Rules:
- Only extract what is explicitly in the signal. Do not infer.
- magnitude 1: minor (one new store). magnitude 3: significant (major chain expansion). magnitude 5: transformative (new metro line, major industrial zone).
- Score adjustments must match direction — positive direction means positive integer adjustment.
- If the signal is not relevant to this city's distribution landscape, return empty developments array and zero adjustments.`;

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    const data = parseJson(responseText);

    // Validate and format response to ensure it matches CityEnrichment structure
    const developments = Array.isArray(data.developments)
      ? data.developments.map((d: any) => ({
          type: d.type || "economic",
          description: d.description || "",
          impact: d.impact || "income",
          direction: d.direction || "positive",
          magnitude: typeof d.magnitude === "number" ? d.magnitude : 1,
          date: d.date || new Date().toISOString().substring(0, 7),
          source: d.source || "unknown"
        }))
      : [];

    const retail = typeof data.scoreAdjustments?.retail === "number" ? data.scoreAdjustments.retail : 0;
    const cold = typeof data.scoreAdjustments?.cold === "number" ? data.scoreAdjustments.cold : 0;
    const income = typeof data.scoreAdjustments?.income === "number" ? data.scoreAdjustments.income : 0;
    const internet = typeof data.scoreAdjustments?.internet === "number" ? data.scoreAdjustments.internet : 0;

    let competitorMentions = null;
    if (data.competitorMentions && typeof data.competitorMentions === "object") {
      const category = data.competitorMentions.category;
      const brands = Array.isArray(data.competitorMentions.brands) ? data.competitorMentions.brands : [];
      const saturation = data.competitorMentions.saturation;
      if (category && saturation) {
        competitorMentions = { category, brands, saturation };
      }
    }

    return {
      developments,
      scoreAdjustments: { retail, cold, income, internet },
      competitorMentions
    };
  } catch (error) {
    console.error(`[ENRICH] Failed to enrich city ${city.name}:`, error);
    return emptyEnrichment();
  }
}

export function applyEnrichment(city: City, enrichment: CityEnrichment): City {
  // Prepend new developments, keep last 10 only
  const oldDevelopments = city.recentDevelopments || [];
  const newDevelopments = enrichment.developments || [];
  const recentDevelopments = [...newDevelopments, ...oldDevelopments].slice(0, 10);

  // Clamp function helper
  const clamp = (val: number, min: number, max: number) => Math.min(Math.max(val, min), max);

  // ADD new adjustments to existing ones, clamp between -10 and +10
  const retailScoreAdjustment = clamp((city.retailScoreAdjustment || 0) + (enrichment.scoreAdjustments?.retail || 0), -10, 10);
  const coldScoreAdjustment = clamp((city.coldScoreAdjustment || 0) + (enrichment.scoreAdjustments?.cold || 0), -10, 10);
  const incomeScoreAdjustment = clamp((city.incomeScoreAdjustment || 0) + (enrichment.scoreAdjustments?.income || 0), -10, 10);
  const internetScoreAdjustment = clamp((city.internetScoreAdjustment || 0) + (enrichment.scoreAdjustments?.internet || 0), -10, 10);

  // Merge competitorPresence
  const competitorPresence = { ...(city.competitorPresence || {}) };
  const competitorSaturation = { ...(city.competitorSaturation || {}) };

  if (enrichment.competitorMentions) {
    const { category, brands, saturation } = enrichment.competitorMentions;
    if (category) {
      // merge brands uniquely
      const existingBrands = competitorPresence[category] || [];
      const mergedBrands = Array.from(new Set([...existingBrands, ...brands]));
      competitorPresence[category] = mergedBrands;

      // update saturation
      if (saturation) {
        competitorSaturation[category] = saturation;
      }
    }
  }

  return {
    ...city,
    recentDevelopments,
    retailScoreAdjustment,
    coldScoreAdjustment,
    incomeScoreAdjustment,
    internetScoreAdjustment,
    competitorPresence,
    competitorSaturation,
    lastEnriched: new Date().toISOString()
  };
}

import { GoogleGenerativeAI } from "@google/generative-ai";
import type { ExtractedFeatures, ProductProfile } from "@/lib/types";
import { generateCacheKey } from "@/lib/cache";
import { redis } from "@/lib/redis";
import { buildEmbeddingInput, generateEmbedding } from "@/lib/embeddings";
import { findSimilarAnalysis } from "@/db/queries";
import { generateContentWithRetry } from "@/lib/gemini-retry";

// ─── System prompt ────────────────────────────────────────────────────────────

const systemPrompt = `You are a distribution intelligence engine for Indian consumer markets.

You receive a structured product profile and must return calibrated scoring parameters.
Return ONLY valid JSON — no explanation, no markdown, no code fences.

OUTPUT SCHEMA (return exactly this):
{
  "productName": string,
  "category": string,
  "priceINR": number,
  "priceSegment": "mass" | "mid" | "premium" | "luxury",
  "incomeWeight": number,
  "retailWeight": number,
  "internetWeight": number,
  "coldWeight": number,
  "logisticsWeight": number,
  "affordability": number,
  "targetAudience": string,
  "needsColdChain": boolean,
  "distributionLevel": 0 | 1 | 2 | 3,
  "distributionType": "intensive" | "selective" | "exclusive",
  "distributorProfile": "direct" | "retailer" | "wholesaler" | "broker-agent",
  "channels": string[],
  "keyInsight": string,
  "seasonality": string
}

━━━ PRICE SEGMENT RULES ━━━
Do NOT use absolute price thresholds alone. You MUST evaluate priceINR relative to BOTH the product category AND the packSize (quantity).
The absolute ranges below are general starting guidelines for standard bulk FMCG only. Override them using category and pack size context.

Critical Examples to calibrate your judgment:
  - ₹90 / 500g Family Pack Biscuits      → mass    (high quantity, staple FMCG)
  - ₹90 / Single 15g Artisanal Cookie    → premium (tiny quantity, indulgence)
  - ₹90 / Single Ice Cream Cone (90ml)   → premium (small indulgence, not daily staple)
  - ₹90 / 1-Litre Ice Cream Tub          → mid     (standard family-size unit)
  - ₹500 / Basic Cotton T-Shirt          → mass    (standard apparel price point)
  - ₹500 / 10ml Perfume Vial             → premium (small luxury)
  - ₹200 / 1kg Atta (Wheat Flour)        → mass    (staple commodity)
  - ₹200 / 200ml Craft Cold Brew Coffee  → premium (urban lifestyle product)

General Guidelines (override with context):
mass    → cheap relative to category norms and pack size; daily staple; accessible to bottom 60% of India
mid     → standard pricing for the category; accessible to middle class
premium → expensive relative to category norms or small pack size; aspirational
luxury  → extreme status symbol; priceINR > 5,000 OR ultra-small quantity of rare goods

━━━ WEIGHT CALIBRATION RULES ━━━
All five weights (incomeWeight, retailWeight, internetWeight, coldWeight, logisticsWeight) must sum exactly to 1.0.
If needsColdChain is false, set coldWeight to 0.

incomeWeight:
  HIGH (0.30–0.40) → luxury or premium products where purchasing power is a genuine barrier.
  MEDIUM (0.15–0.29) → standard consumer goods.
  LOW (0.05–0.14) → mass FMCG or daily essentials.

retailWeight:
  HIGH (0.25–0.35) → physical shelf-dependent items: fresh food, beverages, daily hygiene.
  MEDIUM (0.15–0.24) → hybrid offline/online items.
  LOW (0.05–0.14) → digital-first or online-only items.

internetWeight:
  HIGH (0.25–0.35) → products relying heavily on e-commerce or quick commerce.
  MEDIUM (0.15–0.24) → products sold both online and offline.
  LOW (0.05–0.14) → traditional offline-heavy distribution.

coldWeight (only if needsColdChain is true):
  HIGH (0.20–0.30) → highly perishable, critical refrigeration (dairy, fresh juices).
  MEDIUM (0.10–0.19) → refrigeration beneficial but not immediately fatal (chilled energy drinks, cosmetics).
  Set to 0 if needsColdChain is false.

logisticsWeight:
  HIGH (0.20–0.30) → low margin, bulky or heavy items (atta, water bottles, bulky home appliances) where shipping is expensive relative to product value.
  MEDIUM (0.10–0.19) → standard logistics complexity items.
  LOW (0.05–0.09) → lightweight, high-value electronics (smartwatches, jewelry, premium perfumes) where logistics cost is trivial.

━━━ AFFORDABILITY MULTIPLIER ━━━
Applied as a penalty scaler to income and retail scoring signals only (not the whole score).
Reflects how price constrains the addressable consumer base and retail shelf willingness.
Do NOT derive this from absolute price alone. Derive it from the priceSegment you assigned above (which already accounts for category and pack size).

mass    → 1.10 (product is cheap for its category; sachet/bulk pricing expands addressable market)
mid     → 1.00 (neutral; standard pricing for the category)
premium → 0.85 (moderate income gate; restricts to upper-middle class and metros)
premium (high) → 0.70 (strong income gate; if product is highly expensive for its category)
luxury  → 0.55 (severe income gate; viable only in top 8 metros)

Examples:
  - ₹90 Single Ice Cream Cone → priceSegment: premium → affordability: 0.85
  - ₹90 500g Biscuit Pack     → priceSegment: mass    → affordability: 1.10
  - ₹500 Basic T-Shirt        → priceSegment: mass    → affordability: 1.10
  - ₹500 10ml Perfume Vial    → priceSegment: premium → affordability: 0.85

━━━ DISTRIBUTION LEVEL ━━━
0 → Brand sells direct only (luxury D2C, flagship store, no intermediaries)
1 → One intermediary (brand → retailer direct, or brand → marketplace FBA)
2 → Two levels (brand → regional distributor → retailer)
3 → Three levels (brand → super-stockist → sub-distributor → retailer)

━━━ DISTRIBUTION TYPE ━━━
exclusive  → very few points of sale, brand experience paramount (luxury)
selective  → quality outlets in right formats (premium gyms, pharmacies, modern trade)
intensive  → maximum reach, everywhere the target buyer shops (mass FMCG)

━━━ DISTRIBUTOR PROFILE ━━━
direct         → brand-owned sales or key account direct
retailer       → modern trade and priority multi-brand retailers
wholesaler     → regional wholesalers covering sub-distributors
broker-agent   → broker-agent network for last-mile market activation

━━━ SEASONALITY ━━━
A short phrase describing the seasonality of demand for this product category in India (e.g. "Peak demand during summer (April-June)", "No seasonal bias", "Peak demand during winter/festive season").`;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getProfile(payload: unknown): ProductProfile | null {
  if (
    typeof payload === "object" &&
    payload !== null &&
    "profile" in payload &&
    typeof (payload as any).profile === "object" &&
    (payload as any).profile !== null
  ) {
    return (payload as any).profile as ProductProfile;
  }
  return null;
}

function parseJson(text: string): ExtractedFeatures {
  const trimmed = text.trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Gemini did not return a JSON object.");
  }

  return JSON.parse(trimmed.slice(start, end + 1)) as ExtractedFeatures;
}

function buildPrompt(profile: ProductProfile): string {
  const lines = [
    `PRODUCT PROFILE TO ANALYSE:`,
    ``,
    `Product:      ${profile.productName} (${profile.subcategory} · ${profile.category})`,
    `Price:        ₹${profile.priceINR} per ${profile.packSize}`,
    `Margin:       ${profile.marginPercent}%`,
    `Cold chain:   ${profile.needsColdChain ? "Required" : "Not required"}`,
    profile.shelfLifeDays
      ? `Shelf life:   ${profile.shelfLifeDays} days`
      : `Shelf life:   Not applicable`,
    ``,
    `Brand:        ${profile.brandName} (${profile.brandMaturity} brand)`,
    `Current channels: ${profile.currentChannels.length ? profile.currentChannels.join(", ") : "None yet"}`,
    `Current cities:   ${profile.currentCities || "None yet"}`,
    `Capacity:     ${profile.monthlyCapacityUnits}`,
    `Launch budget: ${profile.launchBudgetINR}`,
    `Warehouse:    ${profile.warehouseCity || "Not specified"}`,
    `Delivery Radius: ${profile.deliveryRadiusKM} km`,
    ``,
    `Target customer: ${profile.targetCustomer}`,
    `Income target:   ${profile.incomeTarget} (${
      profile.incomeTarget === "mass"
        ? "₹3–8L/yr"
        : profile.incomeTarget === "mid"
        ? "₹8–20L/yr"
        : "₹20L+/yr"
    })`,
    `Preferred region: ${profile.preferredRegion}${
      profile.specificRegion ? ` (${profile.specificRegion})` : ""
    }`,
    ``,
    `Preferred channels: ${profile.preferredChannels.join(", ")}`,
    `Distributor status: ${profile.hasDistributor}`,
    ``,
    `Primary goal:   ${profile.primaryGoal}`,
    `Launch timeline: ${profile.launchTimeline}`,
    `Success metric:  ${profile.successMetric}`,
    profile.competitors
      ? `Known competitors: ${profile.competitors}`
      : `Known competitors: Not specified`,
  ];

  return lines.join("\n");
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey || apiKey === "your_key_here") {
      throw new Error("Missing GEMINI_API_KEY in .env.local.");
    }

    const profile = getProfile(await request.json());

    if (!profile) {
      return Response.json(
        { message: "A valid product profile object is required." },
        { status: 400 }
      );
    }

    const promptText = buildPrompt(profile);
    const cacheKey = generateCacheKey("extract", promptText);

    // 1. EXACT MATCH CHECK (Redis Tier)
    if (redis) {
      try {
        const cached = await redis.get<ExtractedFeatures>(cacheKey);
        if (cached !== null && cached !== undefined) {
          console.log(`[CACHE EXACT HIT] ${cacheKey}`);
          return Response.json(cached);
        }
      } catch (error) {
        console.error(`[CACHE ERROR] Exact match read error for ${cacheKey}:`, error);
      }
    }

    // 2. SIMILARITY CHECK (pgvector Tier)
    let similarMatch: { features: ExtractedFeatures; similarity: number } | null = null;

    if (process.env.PGVECTOR_DISABLED !== "true") {
      try {
        const embeddingInput = buildEmbeddingInput(profile);
        const embedding = await generateEmbedding(embeddingInput);
        similarMatch = await findSimilarAnalysis(embedding, 0.90);
      } catch (error) {
        console.error("[CACHE SIMILARITY ERROR] Failed semantic match check:", error);
      }
    }

    let activeSystemPrompt = systemPrompt;
    if (similarMatch) {
      console.log(`[CACHE SIMILAR MATCH] similarity score: ${similarMatch.similarity.toFixed(4)}`);
      activeSystemPrompt = `${systemPrompt}

REFERENCE CONTEXT: A similar product was previously analyzed with this extracted profile:
${JSON.stringify(similarMatch.features, null, 2)}
Use this as a starting reference for consistency, but adjust every field based on what is actually different in the new product description below — particularly any differences in price, target audience, distribution channels, or product specifics. Do not copy the reference blindly; it exists only to keep similar products scored consistently, not to override genuine differences.`;
    } else {
      console.log(`[CACHE MISS - FRESH EXTRACTION]`);
    }

    // 3. CALL GEMINI FOR EXTRACTION
    const genAI = new GoogleGenerativeAI(apiKey);
    const modelName = process.env.GEMINI_MODEL || "gemini-1.5-flash";
    const model = genAI.getGenerativeModel({
      model: modelName,
      systemInstruction: activeSystemPrompt,
      generationConfig: {
        temperature: 0.1,
        responseMimeType: "application/json",
      },
    });

    const result = await generateContentWithRetry(model, promptText);
    const text = result.response.text();
    const extractedFeatures = parseJson(text);

    // 4. STORE EXACT MATCH IN REDIS
    if (redis) {
      try {
        const SEVEN_DAYS_IN_SECONDS = 7 * 24 * 60 * 60;
        await redis.set(cacheKey, extractedFeatures, { ex: SEVEN_DAYS_IN_SECONDS });
      } catch (error) {
        console.error(`[CACHE ERROR] Failed to set Redis exact key ${cacheKey}:`, error);
      }
    }

    return Response.json(extractedFeatures);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Feature extraction failed.";
    return Response.json({ message }, { status: 500 });
  }
}


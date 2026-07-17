import { GoogleGenerativeAI } from "@google/generative-ai";
import type { ExtractedFeatures, ProductProfile } from "@/lib/types";

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
mass    → priceINR < 100
mid     → priceINR 100–500
premium → priceINR 500–5,000
luxury  → priceINR > 5,000

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
Under ₹100   → 1.10 (cheap products boost accessibility)
₹100–500     → 1.00 (neutral)
₹500–2,000   → 0.85 (moderate income gate)
₹2,000–10,000 → 0.70 (strong income gate, limits to metro/affluent T2)
Above ₹10,000 → 0.55 (severe income gate, viable only in top metros)

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
    typeof payload.profile === "object" &&
    payload.profile !== null
  ) {
    return payload.profile as ProductProfile;
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

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: systemPrompt
    });

    const result = await model.generateContent(buildPrompt(profile));
    const text = result.response.text();

    return Response.json(parseJson(text));
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Feature extraction failed.";
    return Response.json({ message }, { status: 500 });
  }
}

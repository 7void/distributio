import cities from "@/data/cities.json";
import type {
  City,
  DistributionLevel,
  DistributionType,
  DistributorProfile,
  ExtractedFeatures,
  PriceSegment,
  ProductProfile,
  ScoreBand,
  ScoredCity
} from "@/lib/types";

const cityData = cities as City[];

// ─── Constants ────────────────────────────────────────────────────────────────

// Base unit demand per million population per month, by price segment.
// These represent the TOTAL category addressable market density, not brand capture.
const BASE_MARKET_DENSITY: Record<PriceSegment, number> = {
  mass: 18000,
  mid: 9000,
  premium: 4000,
  luxury: 1200
};

// Brand capture rates: what % of addressable market a new/emerging/established brand can realistically capture.
const BRAND_CAPTURE_RATE: Record<string, number> = {
  new: 0.02,         // 2% — unknown brand, building awareness
  emerging: 0.05,    // 5% — some traction, growing distribution
  established: 0.10  // 10% — proven brand, expanding reach
};

// Fixed budget lookup (midpoint of each range)
// FIX #5: Replace fragile substring matching with an exact-match map.
const BUDGET_MAP: Record<string, number> = {
  "Under ₹1L":     50_000,
  "₹1L – ₹5L":    300_000,
  "₹5L – ₹20L":  1_250_000,
  "₹20L – ₹1Cr": 6_000_000,
  "Above ₹1Cr":  10_000_000
};

function parseLaunchBudget(budgetStr: string): number {
  return BUDGET_MAP[budgetStr] ?? 500_000; // safe default ₹5L
}

// ─── Utility functions ────────────────────────────────────────────────────────

function getBand(score: number): ScoreBand {
  if (score >= 80) return "PRIME";
  if (score >= 65) return "STRONG";
  if (score >= 50) return "MODERATE";
  if (score >= 35) return "WEAK";
  return "AVOID";
}

// FIX #2 (partial) & FIX #7: Normalize weights to guarantee they sum to 1.0
// before any calculation, preventing silent math errors when Gemini output is off.
function normalizeWeights(w: {
  income: number;
  retail: number;
  internet: number;
  cold: number;
  logistics: number;
}) {
  const sum = w.income + w.retail + w.internet + w.cold + w.logistics;
  if (sum <= 0) {
    // Fallback equal distribution (excluding cold if 0)
    return { income: 0.25, retail: 0.25, internet: 0.25, cold: 0.0, logistics: 0.25 };
  }
  return {
    income:    w.income    / sum,
    retail:    w.retail    / sum,
    internet:  w.internet  / sum,
    cold:      w.cold      / sum,
    logistics: w.logistics / sum
  };
}

// Haversine formula — great-circle distance between two lat/lng points in km
function getDistanceKM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getCityArchitecture(
  features: ExtractedFeatures,
  city: City
): {
  distributionLevel: DistributionLevel;
  distributionType: DistributionType;
  distributorProfile: DistributorProfile;
} {
  if (features.priceSegment === "luxury") {
    return { distributionLevel: city.tier === 1 ? 0 : 1, distributionType: "exclusive", distributorProfile: "direct" };
  }
  if (features.priceSegment === "premium") {
    if (city.tier === 1) return { distributionLevel: 1, distributionType: "selective", distributorProfile: "retailer" };
    if (city.tier === 2) return { distributionLevel: 1, distributionType: "selective", distributorProfile: "broker-agent" };
    return { distributionLevel: 2, distributionType: "selective", distributorProfile: "wholesaler" };
  }
  if (features.priceSegment === "mid") {
    if (city.tier === 1) return { distributionLevel: 1, distributionType: "selective", distributorProfile: "retailer" };
    return {
      distributionLevel: 2,
      distributionType: city.tier === 2 ? "selective" : "intensive",
      distributorProfile: "wholesaler"
    };
  }
  // mass
  if (city.tier === 1) return { distributionLevel: 2, distributionType: "intensive", distributorProfile: "wholesaler" };
  return { distributionLevel: 3, distributionType: "intensive", distributorProfile: "broker-agent" };
}

function getRecommendation(band: ScoreBand, distributionType: DistributionType): string {
  if (band === "PRIME" && distributionType === "exclusive") return "Priority launch city. Open brand boutique or exclusive retail partnership immediately.";
  if (band === "PRIME" && distributionType === "selective") return "Lead market. Activate modern trade and quick commerce simultaneously.";
  if (band === "PRIME" && distributionType === "intensive") return "Maximum volume potential. Deploy full wholesaler network on day one.";
  if (band === "STRONG") return "Phase 2 entry. Enter 60 days after lead markets stabilize.";
  if (band === "MODERATE") return "Test market. Limited SKUs, monitor 90 days before scaling.";
  return "Defer. Revisit in 12-18 months.";
}

// ─── Main scoring function ─────────────────────────────────────────────────────

export function scoreCities(
  features: ExtractedFeatures,
  profile?: ProductProfile
): ScoredCity[] {
  // Resolve warehouse coordinates
  const warehouse = profile?.warehouseCity
    ? cityData.find((c) => c.name.toLowerCase() === profile.warehouseCity.toLowerCase())
    : null;

  // Budget split across assumed 5 initial launch cities
  const totalBudget = parseLaunchBudget(profile?.launchBudgetINR || "₹5L – ₹20L");
  const budgetPerCity = Math.round(totalBudget / 5);

  // Resolve raw weights from Gemini (with safe numeric fallback)
  const rawWeights = {
    income:    typeof features.incomeWeight    === "number" ? features.incomeWeight    : 0.2,
    retail:    typeof features.retailWeight    === "number" ? features.retailWeight    : 0.2,
    internet:  typeof features.internetWeight  === "number" ? features.internetWeight  : 0.2,
    cold:      typeof features.coldWeight      === "number" ? features.coldWeight      : 0.0,
    logistics: typeof features.logisticsWeight === "number" ? features.logisticsWeight : 0.2
  };

  // Redistribute cold weight if product doesn't need it
  if (!features.needsColdChain) {
    rawWeights.retail   += rawWeights.cold / 2;
    rawWeights.internet += rawWeights.cold / 2;
    rawWeights.cold      = 0;
  }

  // FIX #7: Normalize so weights always sum to exactly 1.0
  const w = normalizeWeights(rawWeights);

  const affordability = typeof features.affordability === "number" ? features.affordability : 1.0;

  return cityData
    .map((city) => {
      // ── 1. Dynamic channel signal mapping ──────────────────────────────────
      // ISSUE-1 FIX: features.channels comes from Gemini. If none of Gemini's
      // channel labels match the detection keywords, fall back to the user's
      // own preferredChannels from the form so scoring is never silently wrong.
      const geminiChannels  = features.channels.map((c) => c.toLowerCase());
      const profileChannels = (profile?.preferredChannels ?? []).map((c) => c.toLowerCase());
      // Merge: prefer Gemini's richer channel list, union with form selection
      const channels = [...new Set([...geminiChannels, ...profileChannels])];

      const hasKirana        = channels.some((c) => c.includes("kirana") || c.includes("general"));
      const hasModernTrade   = channels.some((c) => c.includes("modern") || c.includes("supermarket") || c.includes("bigbazaar") || c.includes("dmart") || c.includes("reliance"));
      const hasQuickCommerce = channels.some((c) => c.includes("quick") || c.includes("blinkit") || c.includes("zepto") || c.includes("swiggy") || c.includes("instamart"));
      const hasDTC           = channels.some((c) => c.includes("d2c") || c.includes("website") || c.includes("app") || c.includes("direct"));
      const hasSpecialty     = channels.some((c) => c.includes("specialty") || c.includes("pharmacy") || c.includes("gym") || c.includes("salon"));

      // Retail score: blend based on which channels are selected
      let cityRetailScore = city.retail; // generic fallback (all channels unknown)
      if (hasKirana && hasModernTrade)  cityRetailScore = (city.kiranaScore + city.modernTradeScore) / 2;
      else if (hasKirana)               cityRetailScore = city.kiranaScore;
      else if (hasModernTrade)          cityRetailScore = city.modernTradeScore;
      else if (hasSpecialty)            cityRetailScore = city.modernTradeScore; // specialty retail correlates with MT quality
      // DTC/online-only: retail signal is less relevant — use average of modern trade and internet
      else if (hasDTC && !hasKirana && !hasModernTrade) cityRetailScore = (city.modernTradeScore + city.internet) / 2;

      // Digital score: quick commerce has its own coverage metric; DTC uses internet penetration
      const cityInternetScore = hasQuickCommerce ? city.quickCommerceScore : city.internet;

      // ── 2. Weighted base score (0-100, bounded) ───────────────────────────
      // FIX #1: Weights now always sum to 1.0 via normalizeWeights().
      // The raw score is cleanly 0-100 before any adjustments.
      const baseScore =
        city.income       * w.income    +
        cityRetailScore   * w.retail    +
        cityInternetScore * w.internet  +
        city.cold         * w.cold      +
        city.logisticsScore * w.logistics;

      // ── 3. Affordability — applied to income AND retail signals ──────────
      // Affordability reflects purchasing power gate. It affects both income
      // (consumer ability to pay) and retail (stores stock what sells at the
      // price point). Internet/cold/logistics are infrastructure and unaffected.
      const incomeAffordAdj = (city.income * w.income * affordability) - (city.income * w.income);
      const retailAffordAdj = (cityRetailScore * w.retail * affordability) - (cityRetailScore * w.retail);
      const affordabilityAdjustment = incomeAffordAdj + retailAffordAdj;

      // ── 4. Strategic adjustments — additive (±), clearly bounded ──────────
      // FIX #1 & FIX #4: All previous multiplicative modifiers are now additive
      // point adjustments. This prevents compounding overflow and makes each
      // modifier readable as a discrete pts contribution.
      let adjustment = 0;

      // 4a. Tier alignment with product type
      if (city.tier === 1) adjustment += 4; // Metro bonus
      const isMassIntensive = features.priceSegment === "mass" && features.distributionType === "intensive";
      if (city.tier === 3 && !isMassIntensive) adjustment -= 5; // Tier-3 penalty for non-mass products

      // 4b. Cold chain strength bonus
      if (city.cold > 85 && features.needsColdChain && features.coldWeight > 0.25) adjustment += 2;

      // 4c. Population density bonus (max +4)
      adjustment += Math.min(city.population * 0.12, 4);

      // 4d. Distribution fit
      if (features.distributionType === "exclusive") {
        if (city.tier === 3) adjustment -= 20;
        else if (city.tier === 2) adjustment -= 10;
      }
      if (features.distributionType === "intensive" && cityRetailScore > 80) adjustment += 3;

      // FIX #4: Previously unused form inputs now affect the score.

      // 4e. Brand maturity — new brands struggle in crowded T1 metros
      const brandMaturity = profile?.brandMaturity ?? "new";
      if (brandMaturity === "new" && city.tier === 1) adjustment -= 4;
      if (brandMaturity === "established" && city.tier === 1) adjustment += 2;

      // 4f. Primary goal alignment
      const primaryGoal = profile?.primaryGoal ?? "revenue";
      if (primaryGoal === "brand_awareness" && city.tier === 1) adjustment += 3; // metros = visibility
      // profitability goal penalizes low-margin cities (will also get hit by margin multiplier below)

      // 4g. Distributor readiness: no distributor + deep distribution = friction
      // ISSUE-2 FIX: "direct" = brand sells D2C, no distributor needed.
      // It should NOT get the -6 penalty (that's for brands who *need* one but lack it).
      // D2C brands score better in metros where internet + quick commerce is strong.
      const hasDistributor = profile?.hasDistributor ?? "no";
      if (hasDistributor === "no" && features.distributionLevel >= 3) adjustment -= 6;
      if (hasDistributor === "yes" && features.distributionLevel >= 2) adjustment += 2;
      if (hasDistributor === "direct") {
        // D2C brands benefit from strong internet/quick-commerce cities
        if (city.tier === 1) adjustment += 3;          // metros: high internet + fast delivery infra
        if (cityInternetScore > 75)   adjustment += 2; // any city with strong digital penetration
        if (city.tier === 3)          adjustment -= 4; // Tier-3: poor logistics for last-mile D2C
      }

      // 4h. Preferred region match bonus
      const preferredRegion = profile?.preferredRegion ?? "all";
      if (preferredRegion === "metro" && city.tier === 1) adjustment += 3;
      if (preferredRegion === "tier2plus" && city.tier !== 1) adjustment += 3;

      // Combine base + affordability drift + strategic adjustments
      let raw = baseScore + affordabilityAdjustment + adjustment;

      // ── 5. Unit economics & logistics feasibility ──────────────────────────
      let distance = 0;
      if (warehouse && warehouse.id !== city.id) {
        distance = getDistanceKM(warehouse.lat, warehouse.lng, city.lat, city.lng);
      }

      // Freight cost: baseline + distance surcharge + cold chain surcharge - logistics discount
      // Then scaled by volume discount: mass products ship in bulk pallets (low per-unit cost),
      // luxury products ship individually (high per-unit cost).
      const VOLUME_DISCOUNT: Record<PriceSegment, number> = {
        mass: 0.25,     // palletised full-truck-load, cost spread across 24-48 units per case
        mid: 0.45,      // cases of 12-24, partial truck loads
        premium: 0.80,  // smaller batches, more careful handling
        luxury: 1.00    // individual handling, insurance, white-glove
      };
      let baseLogisticsCost = 10;
      baseLogisticsCost += (distance / 100) * 2.5;
      if (features.needsColdChain) baseLogisticsCost += 12;
      baseLogisticsCost -= (city.logisticsScore / 100) * 4;
      baseLogisticsCost *= (VOLUME_DISCOUNT[features.priceSegment] ?? 0.50);
      const logisticsCostPerUnit = Math.round(Math.max(2, Math.min(baseLogisticsCost, 95)));

      // Unit profit margin after logistics
      const marginPercent = profile?.marginPercent ?? 30;
      const unitMarginBeforeLogistics = features.priceINR * (marginPercent / 100);
      const marginPerUnit = Math.round(Math.max(0, unitMarginBeforeLogistics - logisticsCostPerUnit));

      // Break-even units needed to recoup per-city budget allocation
      const breakEvenUnits = marginPerUnit > 0 ? Math.round(budgetPerCity / marginPerUnit) : 999_999;

      // Margin ratio: 0 = all margin eaten by freight, 1 = no logistics cost
      const marginRatio = unitMarginBeforeLogistics > 0
        ? marginPerUnit / unitMarginBeforeLogistics
        : 0;

      // FIX #3: Lower the floor from 0.65 to 0.30.
      // A city where logistics eats 100% of margin can no longer score above 30% of its base.
      // Also penalise profitability-goal products on low-margin cities even more.
      let marginMultiplier = 0.30 + (marginRatio * 0.70); // range: 0.30 – 1.00
      if (primaryGoal === "profitability" && marginRatio < 0.4) {
        marginMultiplier *= 0.75; // extra 25% haircut on bad-margin cities for profit-focused brands
      }

      raw *= marginMultiplier;

      // Delivery radius penalty (max -35 pts, applied after margin multiplier)
      let radiusPenalty = 0;
      if (profile?.deliveryRadiusKM && distance > profile.deliveryRadiusKM) {
        const excessKM = distance - profile.deliveryRadiusKM;
        radiusPenalty = Math.min(35, Math.round(excessKM / 40));
        raw -= radiusPenalty;
      }

      // FIX #1: Final score is now legitimately bounded because:
      // baseScore ≤ 100, adjustment ≤ +15 or so, but margin multiplier ≤ 1.0
      // so raw rarely exceeds ~115, and capping at 100 is only a minor trim.
      const score = Math.max(0, Math.min(Math.round(raw), 100));
      const band  = getBand(score);
      const architecture = getCityArchitecture(features, city);

      // ── 6. Demand forecast — market penetration model ─────────────────────
      // FIX #6: Replace population × flat-units formula with a market-share model.
      // brandCaptureRate = % of addressable market this brand can realistically capture.
      // channelReachFactor = estimated reach coverage based on channels selected (max 60%).
      const captureRate = BRAND_CAPTURE_RATE[brandMaturity] ?? 0.02;
      const channelCount = features.channels.length;
      const channelReachFactor = Math.min(channelCount * 0.15, 0.60);

      const demand = Math.round(
        (score / 100) *
        city.population *
        BASE_MARKET_DENSITY[features.priceSegment] *
        captureRate *
        channelReachFactor
      );

      // ── 7. Confidence level ───────────────────────────────────────────────
      let confidenceLevel: "high" | "medium" | "low" = "high";
      if (profile?.deliveryRadiusKM && distance > profile.deliveryRadiusKM) {
        confidenceLevel = "low";
      } else if (profile?.incomeTarget === "premium" && city.income < 55) {
        confidenceLevel = "medium";
      } else if (features.needsColdChain && city.cold < 45) {
        confidenceLevel = "low";
      } else if (brandMaturity === "new" && city.tier === 1) {
        confidenceLevel = "medium"; // competitive markets are uncertain for new brands
      }

      const seasonalityImpact = features.seasonality || "No seasonal bias predicted.";

      // ── 8. Score breakdown — now matches the actual computation ──────────
      // The breakdown accounts for all phases: signals → adjustments → feasibility → radius.
      const feasibilityImpactPct = Math.round((1 - marginMultiplier) * 100); // e.g. 22 means "-22%"

      return {
        ...city,
        score,
        demand,
        demandLow:  Math.round(demand * 0.6),
        demandHigh: Math.round(demand * 1.5),
        band,
        scoreBreakdown: {
          incomeContribution:    Math.round(city.income         * w.income + incomeAffordAdj),
          retailContribution:    Math.round(cityRetailScore     * w.retail + retailAffordAdj),
          internetContribution:  Math.round(cityInternetScore   * w.internet),
          coldContribution:      Math.round(city.cold           * w.cold),
          logisticsContribution: Math.round(city.logisticsScore * w.logistics),
          adjustmentContribution: Math.round(adjustment),
          feasibilityImpactPct,
          radiusPenalty
        },
        distributionLevel:    architecture.distributionLevel,
        distributionType:     architecture.distributionType,
        distributorProfile:   architecture.distributorProfile,
        cityRecommendation:   getRecommendation(band, architecture.distributionType),
        logisticsCostPerUnit,
        marginPerUnit,
        breakEvenUnits,
        confidenceLevel,
        seasonalityImpact
      };
    })
    // Apply preferredRegion as a hard filter on the final sorted list.
    .filter((city) => {
      const region = profile?.preferredRegion ?? "all";
      if (region === "metro")     return city.tier === 1;
      if (region === "tier2plus") return city.tier !== 1;
      // ISSUE-4 FIX: "specific" now filters by state name.
      // The user types e.g. "Maharashtra, South India" — we tokenise and match
      // against city.state. Known regional aliases are expanded below.
      if (region === "specific" && profile?.specificRegion) {
        const input = profile.specificRegion.toLowerCase();
        const tokens = input.split(/[,;/]+/).map((t) => t.trim()).filter(Boolean);
        // Regional alias expansion
        const REGION_ALIASES: Record<string, string[]> = {
          "south india":    ["karnataka", "tamil nadu", "andhra pradesh", "telangana", "kerala"],
          "north india":    ["delhi", "uttar pradesh", "punjab", "haryana", "rajasthan", "himachal pradesh", "uttarakhand", "jammu and kashmir"],
          "west india":     ["maharashtra", "gujarat", "goa", "rajasthan"],
          "east india":     ["west bengal", "odisha", "bihar", "jharkhand", "assam"],
          "central india":  ["madhya pradesh", "chhattisgarh"],
          "northeast":      ["assam", "meghalaya", "manipur", "mizoram", "nagaland", "tripura", "arunachal pradesh", "sikkim"],
          "north east":     ["assam", "meghalaya", "manipur", "mizoram", "nagaland", "tripura", "arunachal pradesh", "sikkim"],
          "ncr":            ["delhi", "haryana", "uttar pradesh"],
          "national capital region": ["delhi", "haryana", "uttar pradesh"]
        };
        const expandedStates = new Set<string>();
        tokens.forEach((token) => {
          if (REGION_ALIASES[token]) {
            REGION_ALIASES[token].forEach((s) => expandedStates.add(s));
          } else {
            expandedStates.add(token); // treat as direct state name
          }
        });
        return [...expandedStates].some((s) => city.state.toLowerCase().includes(s));
      }
      return true; // "all" passes through everything
    })
    .sort((a, b) => b.score - a.score);
}

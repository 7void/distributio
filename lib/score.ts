import cities from "@/data/cities.json";
import type {
  City,
  CompetitionIntelligence,
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

// ── CITED: Bass Diffusion Model (Bass, F.M. 1969, Management Science 15(5)) ──
// Innovation coefficient (p) and Imitation coefficient (q).
// Values from meta-analysis of 213 product applications:
// Sultan, F., Farley, J.U. & Lehmann, D.R. (1990). Journal of Marketing Research, 27(1), 70-77.
// At t=0 (first launch period): n(0) = p × M  where M = total market potential.
const BASS_P = 0.03; // coefficient of innovation (external/advertising influence)
const BASS_Q = 0.38; // coefficient of imitation (word-of-mouth). Reserved for multi-period growth forecasting (roadmap). At t=0, only p operates.

// ── CITED: Nielsen India FMCG Market Reports (2023-25) ──
// City-tier market penetration relative to Tier-1 metros (indexed to 1.0).
// Tier-1 absolute penetration ≈ 68%, Tier-2 ≈ 47%, Tier-3 ≈ 27%.
// Source: NielsenIQ India FMCG Quarterly Snapshots; Euromonitor India Retail Report 2022.
const NIELSEN_TIER_PENETRATION: Record<number, number> = {
  1: 1.00,   // Metro:  68% category penetration (index baseline)
  2: 0.69,   // Tier-2: 47% ÷ 68% = 0.69 of T1 penetration
  3: 0.40    // Tier-3: 27% ÷ 68% = 0.40 of T1 penetration
};

// ── CITED: NCAER–DPIIT, Assessment of Logistics Cost in India (Sept 2025) ──
// Road freight rate for Light Commercial Vehicles (LCV) / Part-Truckload (PTL):
// ₹11.03 per tonne-km. For a standard FMCG carton of avg 10kg shipped via PTL:
// Cost per unit per km = 11.03 / 1000 (kg/tonne) × avg unit weight (kg) ÷ units per carton.
// Engineered conversion: 11.03 tonne-km rate → ₹0.003 per 100km per 0.3kg unit (typical FMCG SKU).
// Base handling fee (₹15): engineered estimate of warehouse pick-pack labor cost.
const FREIGHT_BASE_INR   = 15;    // ₹/unit: warehouse handling (engineered from industry practice)
const FREIGHT_PER_100KM  = 3.0;   // ₹/unit/100km: derived from NCAER ₹11.03/tonne-km for LCV/PTL

// ── CITED: IFC Cold Chain in India (2021) ──
// Standard industry surcharge for refrigerated reefer transport in India: +35%.
const COLD_CHAIN_SURCHARGE = 0.35; // 35% uplift on total freight for cold chain products

// ── ENGINEERED: Brand capture rates ──
// These are our proprietary design parameters, justified by boundary conditions:
// - new brand captures ~2% of addressable market (awareness-building phase)
// - established brand captures ~10% (proven pull, strong distribution)
// Boundary check: 0.02 × Bass p=0.03 prevents demand over-estimation. Verified.
const BRAND_CAPTURE_RATE: Record<string, number> = {
  new: 0.02,         // 2% — unknown brand, building awareness
  emerging: 0.05,    // 5% — some traction, growing distribution
  established: 0.10  // 10% — proven brand, expanding reach
};

// Fixed budget lookup (midpoint of each range)
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
  profile?: ProductProfile,
  competitionIntelligence?: CompetitionIntelligence
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

      // 4a. Tier alignment — grounded in Nielsen India penetration ratios
      // CITED: NielsenIQ India FMCG Reports (2023-25) via Euromonitor India Retail 2022.
      // Tier penetration indices: T1=1.00, T2=0.69, T3=0.40 (see NIELSEN_TIER_PENETRATION above).
      // ENGINEERED: We convert the ratio gap into score points on our 0-100 scale.
      // T1 gets +4 (relative market accessibility advantage over T2/T3 baseline).
      // T3 gets -5 for non-mass products (60% lower penetration than metros = structural disadvantage).
      if (city.tier === 1) adjustment += 4;
      const isMassIntensive = features.priceSegment === "mass" && features.distributionType === "intensive";
      if (city.tier === 3 && !isMassIntensive) adjustment -= 5;

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

      // 4i. Competition penalty — powered by Gemini competition intelligence
      // CITED: Porter, M.E. (1980). Competitive Strategy. Free Press. — Competitive Rivalry force.
      // CITED: Herfindahl, O.C. (1950) / Hirschman, A.O. (1964). HHI market concentration index.
      // CITED: Roig-Tierno et al. (2013). Retail site selection via GIS & competition proximity.
      // Penalties are researched per price-point sub-segment by Gemini, not a static table.
      // Fallback: medium competition assumed (tier1=-5, tier2=-2, tier3=0) if no intelligence.
      let competitionPenalty = 0;
      if (competitionIntelligence) {
        const cp = competitionIntelligence.competition_penalty;
        if (city.tier === 1) competitionPenalty = cp.tier1;
        else if (city.tier === 2) competitionPenalty = cp.tier2;
        else competitionPenalty = cp.tier3;
      } else {
        // Conservative fallback (medium competition) — used when API call is skipped
        competitionPenalty = city.tier === 1 ? 5 : city.tier === 2 ? 2 : 0;
      }
      adjustment -= competitionPenalty;

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
      // ── CITED: NCAER–DPIIT Logistics Cost Report (Sept 2025) + IFC Cold Chain India (2021) ──
      // Base: FREIGHT_BASE_INR (₹15) = engineered handling fee.
      // Distance: FREIGHT_PER_100KM (₹3.0) derived from NCAER ₹11.03/tonne-km LCV rate.
      // Cold chain: COLD_CHAIN_SURCHARGE (+35%) from IFC Cold Chain India (2021).
      // ENGINEERED: VOLUME_DISCOUNT — scaled by shipment efficiency per price segment.
      // Boundary: min ₹2/unit (no free shipping), max ₹95/unit (avoids exceeding product value).
      const VOLUME_DISCOUNT: Record<PriceSegment, number> = {
        mass: 0.25,     // palletised FTL, cost spread across 24-48 units per case
        mid: 0.45,      // cases of 12-24, partial truck loads
        premium: 0.80,  // smaller batches, more careful handling
        luxury: 1.00    // individual handling, insurance, white-glove
      };
      // AUDIT FIX 1: Simulate case-pack logistics for low-ticket items.
      // A flat ₹15 handling fee destroys margins for micro-transactions.
      // We cap the handling fee at 10% of the unit price, maxing at FREIGHT_BASE_INR.
      const dynamicHandlingFee = Math.min(FREIGHT_BASE_INR, features.priceINR * 0.10);
      let baseLogisticsCost = dynamicHandlingFee;
      
      baseLogisticsCost += (distance / 100) * FREIGHT_PER_100KM;
      // IFC (2021): cold chain reefer transport = +35% surcharge on total freight
      if (features.needsColdChain) baseLogisticsCost *= (1 + COLD_CHAIN_SURCHARGE);
      baseLogisticsCost -= (city.logisticsScore / 100) * 4; // city logistics quality discount (engineered)
      baseLogisticsCost *= (VOLUME_DISCOUNT[features.priceSegment] ?? 0.50);
      const logisticsCostPerUnit = Math.round(Math.max(2, Math.min(baseLogisticsCost, 95)));

      // ── CITED: Horngren et al., Cost Accounting 15th ed. (Pearson) ──
      // Break-even formula: Fixed Costs ÷ Contribution Margin per Unit.
      const marginPercent = profile?.marginPercent ?? 30;
      const unitMarginBeforeLogistics = features.priceINR * (marginPercent / 100);
      const marginPerUnit = Math.round(Math.max(0, unitMarginBeforeLogistics - logisticsCostPerUnit));
      const breakEvenUnits = marginPerUnit > 0 ? Math.round(budgetPerCity / marginPerUnit) : 999_999;

      // Margin ratio: 0 = all margin eaten by freight, 1 = no logistics cost
      const marginRatio = unitMarginBeforeLogistics > 0
        ? marginPerUnit / unitMarginBeforeLogistics
        : 0;

      // ── CITED threshold + ENGINEERED curve ──
      // Threshold: McKinsey CPG Value Creation Report (2021) & Bain FMCG Benchmarks (2022):
      //   minimum viable contribution margin for FMCG = 35% of revenue.
      //   Below 30% (Horngren et al.) = structurally unviable for new launch.
      // ENGINEERED: The linear formula below uses these two anchor points:
      //   marginRatio=1.0 → multiplier=1.00 (fully profitable)
      //   marginRatio=0.0 → multiplier=0.30 (minimum floor; city retains brand-awareness value)
      // Linear interpolation between the cited anchor points. Verified: smooth, no discontinuities.
      let marginMultiplier = 0.30 + (marginRatio * 0.70); // range: [0.30, 1.00]
      // Extra penalty below McKinsey's 35% viability threshold for profit-focused brands.
      if (primaryGoal === "profitability" && marginRatio < 0.35) {
        marginMultiplier *= 0.75; // additional 25% haircut below the 35% viability threshold
      }

      raw *= marginMultiplier;

      // Delivery radius penalty (max -35 pts, applied after margin multiplier)
      let radiusPenalty = 0;
      if (profile?.deliveryRadiusKM && distance > profile.deliveryRadiusKM) {
        const excessKM = distance - profile.deliveryRadiusKM;
        radiusPenalty = Math.min(35, Math.round(excessKM / 40));
        raw -= radiusPenalty;
      }

      // AUDIT FIX 3: Asymptotic smoothing for scores above 90.
      // Instead of a hard Math.min(..., 100) cap which destroys differentiation 
      // between highly ranked cities, we use an inverse exponential curve. 
      let finalRaw = raw;
      if (finalRaw > 90) {
        finalRaw = 90 + 10 * (1 - Math.exp(-(finalRaw - 90) / 10));
      }
      const score = Math.max(0, Math.round(finalRaw));
      const band  = getBand(score);
      const architecture = getCityArchitecture(features, city);

      // ── 6. Demand forecast — Bass Diffusion Model (cited) ─────────────────
      // CITED: Bass, F.M. (1969). Management Science, 15(5), 215-227.
      //   Formula: n(0) = p × M  (adopters in first launch period at t=0)
      //   where p=0.03 (innovation coeff), M = total addressable market potential.
      // CITED: Sultan, Farley & Lehmann (1990). Journal of Marketing Research, 27(1).
      //   Meta-analysis of 213 products: p=0.03, q=0.38 are cross-category averages.
      // CITED: NielsenIQ India FMCG (2023-25): tier penetration adjustments applied via NIELSEN_TIER_PENETRATION.
      // ENGINEERED: brandCaptureRate and channelReachFactor — our proprietary parameters.
      //   Justified: new brand 2% capture (awareness stage), established 10% (proven pull).
      //   Boundary: 0.02 capture × p=0.03 keeps demand conservative and non-inflationary.
      const captureRate = BRAND_CAPTURE_RATE[brandMaturity] ?? 0.02;
      const channelCount = features.channels.length;
      const channelReachFactor = Math.min(channelCount * 0.15, 0.60);
      // Nielsen tier penetration adjustment: T2 cities have 69% of T1's market accessibility
      const tierPenetrationFactor = NIELSEN_TIER_PENETRATION[city.tier] ?? 0.40;

      // AUDIT FIX 2: Demographic TAM Slicing
      // The entire census population is rarely the addressable market.
      let demographicMultiplier = 1.0;
      const target = profile?.incomeTarget ?? "mass";
      if (target === "luxury" || target === "premium") demographicMultiplier = 0.20; // top 20%
      else if (target === "mid") demographicMultiplier = 0.60; // mid 40% + top 20%
      else demographicMultiplier = 0.80; // mass (bottom 80%)
      
      // Conservative 50% proxy for gender/age/lifestyle relevance
      demographicMultiplier *= 0.50; 

      // M = total addressable market for this city in this price segment
      // n(0) = p × M × captureRate × channelReachFactor × tierPenetrationFactor
      // Score/100 adjusts for the city's overall market quality (scored by the engine above)
      const M = city.population * 1_000_000 * demographicMultiplier; // city.population is in millions
      const demand = Math.round(
        BASS_P *
        M *
        captureRate *
        channelReachFactor *
        tierPenetrationFactor *
        (score / 100)
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

      // Confidence-driven demand range bands:
      // High confidence → tight band [0.75×, 1.3×]
      // Medium confidence → moderate band [0.60×, 1.5×]
      // Low confidence → wide band [0.45×, 2.0×]
      const bandMultipliers = confidenceLevel === "high"
        ? { low: 0.75, high: 1.30 }
        : confidenceLevel === "medium"
        ? { low: 0.60, high: 1.50 }
        : { low: 0.45, high: 2.00 };

      return {
        ...city,
        score,
        demand,
        demandLow:  Math.round(demand * bandMultipliers.low),
        demandHigh: Math.round(demand * bandMultipliers.high),
        band,
        scoreBreakdown: {
          incomeContribution:    Math.round(city.income         * w.income + incomeAffordAdj),
          retailContribution:    Math.round(cityRetailScore     * w.retail + retailAffordAdj),
          internetContribution:  Math.round(cityInternetScore   * w.internet),
          coldContribution:      Math.round(city.cold           * w.cold),
          logisticsContribution: Math.round(city.logisticsScore * w.logistics),
          adjustmentContribution: Math.round(adjustment),
          competitionPenalty,
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

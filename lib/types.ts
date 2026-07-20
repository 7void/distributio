export type CityTier = 1 | 2 | 3;

export type ScoreBand = "PRIME" | "STRONG" | "MODERATE" | "WEAK" | "AVOID";

export type PriceSegment = "mass" | "mid" | "premium" | "luxury";

export type DistributionLevel = 0 | 1 | 2 | 3;

export type DistributionType = "intensive" | "selective" | "exclusive";

export type DistributorProfile =
  | "direct"
  | "retailer"
  | "wholesaler"
  | "broker-agent";

export interface City {
  id: string;
  name: string;
  state: string;
  tier: CityTier;
  population: number;
  lat: number;
  lng: number;
  income: number;
  retail: number;
  internet: number;
  cold: number;
  primaryRetailFormat: string;
  topDistributionChallenges: string[];
  strongCategories: string[];
  
  // Phase 2: New static infrastructure signals
  quickCommerceScore: number;
  logisticsScore: number;
  modernTradeScore: number;
  kiranaScore: number;
}

export interface ScoreBreakdown {
  incomeContribution: number;
  retailContribution: number;
  internetContribution: number;
  coldContribution: number;
  logisticsContribution: number;
  // Strategic adjustment total (tier, brand maturity, goal alignment, etc.)
  adjustmentContribution: number;
  // How much % the margin feasibility multiplier scaled the score (e.g. 18 means -18%)
  feasibilityImpactPct: number;
  // Points lost due to exceeding delivery radius (0 if within radius)
  radiusPenalty: number;
}

export interface ScoredCity extends City {
  score: number;
  demand: number;
  demandLow: number;
  demandHigh: number;
  band: ScoreBand;
  scoreBreakdown: ScoreBreakdown;
  distributionLevel: DistributionLevel;
  distributionType: DistributionType;
  distributorProfile: DistributorProfile;
  cityRecommendation: string;
  
  // Phase 2: Feasibility & Economics
  logisticsCostPerUnit: number;
  marginPerUnit: number;
  breakEvenUnits: number;
  confidenceLevel: "high" | "medium" | "low";
  seasonalityImpact: string;
}

export interface ExtractedFeatures {
  productName: string;
  category: string;
  priceINR: number;
  priceSegment: PriceSegment;
  incomeWeight: number;
  retailWeight: number;
  internetWeight: number;
  coldWeight: number;
  logisticsWeight: number; // Phase 2
  affordability: number;
  targetAudience: string;
  needsColdChain: boolean;
  distributionLevel: DistributionLevel;
  distributionType: DistributionType;
  distributorProfile: DistributorProfile;
  channels: string[];
  keyInsight: string;
  
  // Phase 2: Category seasonality
  seasonality: string;
}

export interface AnalysisResult {
  features: ExtractedFeatures;
  scores: ScoredCity[];
  memo: string;
  prompt: string;
  profile?: ProductProfile;
}

// ─── Product Profile (structured onboarding form) ────────────────────────────

export type BrandMaturity = "new" | "emerging" | "established";
export type IncomeTarget = "mass" | "mid" | "premium";
export type DistributorStatus = "yes" | "no" | "direct";

export interface ProductProfile {
  // Step 1 — Product details
  productName: string;
  category: string;
  subcategory: string;
  priceINR: number;
  marginPercent: number;          // Phase 2: Unit economics
  packSize: string;
  shelfLifeDays: number | null;   // null = not applicable
  needsColdChain: boolean;

  // Step 2 — Business context
  brandName: string;
  brandMaturity: BrandMaturity;
  currentChannels: string[];      // e.g. ["D2C website", "Amazon"]
  currentCities: string;          // comma-separated free text
  monthlyCapacityUnits: string;   // range label e.g. "1,000 – 10,000 units/month"
  launchBudgetINR: string;        // range label e.g. "₹5L – ₹20L"
  warehouseCity: string;          // Phase 2: Logistics base city
  deliveryRadiusKM: number;       // Phase 2: Delivery radius constraint

  // Step 3 — Target market
  targetCustomer: string;         // e.g. "Millennials (25-35)"
  incomeTarget: IncomeTarget;
  preferredRegion: string;        // "all" | "metro" | "tier2plus" | "specific"
  specificRegion: string;         // filled when preferredRegion === "specific"

  // Step 4 — Channel preferences
  preferredChannels: string[];
  hasDistributor: DistributorStatus;

  // Step 5 — Goals
  primaryGoal: string;
  launchTimeline: string;
  successMetric: string;
  competitors: string;            // optional, comma-separated competitor names
}

// ─── Phase 3: Strategy & GTM ───────────────────────────────────────────────

export interface ChannelMixRecommendation {
  channel: string;
  priority: number;
  fit_score: number;
  reason: string;
  cities: string[];
}

export interface ChannelMix {
  recommended_channels: ChannelMixRecommendation[];
  channel_split_pct: { channel: string; pct: number }[];
  lead_channel: string;
  lead_channel_reason: string;
}

export interface RiskItem {
  category: string;
  severity: "high" | "medium" | "low";
  likelihood: "high" | "medium" | "low";
  description: string;
  mitigation: string;
}

export interface RiskRegister {
  risk_score: number;
  risks: RiskItem[];
  launch_probability: number;
  go_nogo: "go" | "go_with_caution" | "nogo";
}

export interface GtmPhase {
  phase: number;
  city: string;
  week: string;
  action: string;
}

export interface GtmPlan {
  top_markets: string[];
  launch_sequence: GtmPhase[];
  recommended_strategy: string;
  first_move: string;
}

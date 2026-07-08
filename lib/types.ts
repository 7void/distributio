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
}

export interface ScoreBreakdown {
  incomeContribution: number;
  retailContribution: number;
  internetContribution: number;
  coldContribution: number;
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
  affordability: number;
  targetAudience: string;
  needsColdChain: boolean;
  distributionLevel: DistributionLevel;
  distributionType: DistributionType;
  distributorProfile: DistributorProfile;
  channels: string[];
  keyInsight: string;
}

export interface AnalysisResult {
  features: ExtractedFeatures;
  scores: ScoredCity[];
  memo: string;
  prompt: string;
}

import type {
  ExtractedFeatures,
  RiskAssessment,
  RiskLevel,
  ScoredCity
} from "@/lib/types";

type RiskFactor = {
  points: number;
  driver?: string;
  mitigation?: string;
};

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, value));
}

function getRiskLevel(score: number): RiskLevel {
  if (score <= 25) {
    return "LOW";
  }

  if (score <= 50) {
    return "MEDIUM";
  }

  if (score <= 75) {
    return "HIGH";
  }

  return "CRITICAL";
}

function appendUnique(target: string[], value?: string) {
  if (!value || target.includes(value)) {
    return;
  }

  target.push(value);
}

// Competition risk rises in stronger markets because the best cities usually attract more
// established brands, heavier trade spending, and faster competitor response.
function getCompetitionRisk(cityScore: number): RiskFactor {
  if (cityScore >= 80) {
    return {
      points: 15,
      driver: "High-opportunity markets attract stronger competition",
      mitigation: "Enter with sharper launch execution and trade support"
    };
  }

  if (cityScore >= 65) {
    return {
      points: 10,
      driver: "Attractive markets tend to draw active competitors",
      mitigation: "Differentiate the launch with tighter channel focus"
    };
  }

  if (cityScore >= 50) {
    return {
      points: 5,
      driver: "Moderate markets still face competitor overlap",
      mitigation: "Pilot the market before scaling distribution"
    };
  }

  return {
    points: 2,
    driver: "Lower-scoring markets still carry some competitive pressure",
    mitigation: "Use a narrow pilot launch to validate execution"
  };
}

function getPricingRisk(priceSegment: ExtractedFeatures["priceSegment"]): RiskFactor {
  if (priceSegment === "luxury") {
    return {
      points: 25,
      driver: "Luxury pricing narrows the buyer pool",
      mitigation: "Start in the most affluent cities and channels first"
    };
  }

  if (priceSegment === "premium") {
    return {
      points: 18,
      driver: "Premium pricing limits addressable market",
      mitigation: "Validate demand in Tier-1 markets before wider rollout"
    };
  }

  if (priceSegment === "mid") {
    return {
      points: 10,
      driver: "Mid-tier pricing still requires disciplined value positioning",
      mitigation: "Keep the launch focused on the clearest value channels"
    };
  }

  return {
    points: 5,
    driver: "Mass pricing leaves little room for margin error",
    mitigation: "Protect unit economics with efficient coverage and fulfillment"
  };
}

function getColdChainRisk(
  features: ExtractedFeatures,
  city: ScoredCity
): RiskFactor[] {
  if (!features.needsColdChain) {
    return [];
  }

  const factors: RiskFactor[] = [
    {
      points: 20,
      driver: "Cold-chain infrastructure required",
      mitigation: "Partner with established cold-chain distributors"
    }
  ];

  if (city.cold < 60) {
    factors.push({
      points: 10,
      driver: "This city has weaker cold-chain readiness",
      mitigation: "Prioritize cities with stronger temperature-controlled logistics"
    });
  }

  return factors;
}

function getDistributionComplexityRisk(
  distributionType: ExtractedFeatures["distributionType"]
): RiskFactor {
  if (distributionType === "exclusive") {
    return {
      points: 20,
      driver: "Exclusive distribution increases execution complexity",
      mitigation: "Use a small number of trusted partners and tight controls"
    };
  }

  if (distributionType === "selective") {
    return {
      points: 10,
      driver: "Selective distribution requires disciplined partner management",
      mitigation: "Use specialty retail before wider rollout"
    };
  }

  return {
    points: 5,
    driver: "Intensive distribution still needs operational coordination",
    mitigation: "Roll out through a controlled pilot before broad expansion"
  };
}

function getMarketReadinessRisk(
  features: ExtractedFeatures,
  city: ScoredCity
): RiskFactor | null {
  if (features.priceSegment !== "premium" && features.priceSegment !== "luxury") {
    return null;
  }

  if (city.tier === 1) {
    return {
      points: 3,
      driver: "Even Tier-1 markets require strong premium execution",
      mitigation: "Launch first in Tier-1 cities with the clearest demand signal"
    };
  }

  if (city.tier === 2) {
    return {
      points: 8,
      driver: "Tier-2 markets are less ready for premium execution",
      mitigation: "Use Tier-1 cities to prove the model before expanding"
    };
  }

  return {
    points: 15,
    driver: "Tier-3 markets are harder to convert for premium products",
    mitigation: "Defer lower-tier expansion until the premium model is proven"
  };
}

function collectMitigations(factors: RiskFactor[]): string[] {
  const mitigations: string[] = [];

  for (const factor of factors) {
    appendUnique(mitigations, factor.mitigation);
  }

  return mitigations;
}

export function calculateRisk(
  features: ExtractedFeatures,
  city: ScoredCity
): RiskAssessment {
  const factors: RiskFactor[] = [
    getCompetitionRisk(city.score),
    getPricingRisk(features.priceSegment),
    ...getColdChainRisk(features, city),
    getDistributionComplexityRisk(features.distributionType)
  ];

  const marketReadinessRisk = getMarketReadinessRisk(features, city);

  if (marketReadinessRisk) {
    factors.push(marketReadinessRisk);
  }

  const rawScore = factors.reduce((sum, factor) => sum + factor.points, 0);
  const score = clampScore(rawScore);
  const drivers: string[] = [];

  for (const factor of factors) {
    appendUnique(drivers, factor.driver);
  }

  return {
    score,
    level: getRiskLevel(score),
    drivers,
    mitigations: collectMitigations(factors)
  };
}
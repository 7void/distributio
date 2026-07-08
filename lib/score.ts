import cities from "@/data/cities.json";
import type {
  City,
  DistributionLevel,
  DistributionType,
  DistributorProfile,
  ExtractedFeatures,
  PriceSegment,
  ScoreBand,
  ScoredCity
} from "@/lib/types";

const cityData = cities as City[];

const baseUnitsBySegment: Record<PriceSegment, number> = {
  mass: 18000,
  mid: 9000,
  premium: 4000,
  luxury: 1200
};

function getBand(score: number): ScoreBand {
  if (score >= 80) {
    return "PRIME";
  }

  if (score >= 65) {
    return "STRONG";
  }

  if (score >= 50) {
    return "MODERATE";
  }

  if (score >= 35) {
    return "WEAK";
  }

  return "AVOID";
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
    return {
      distributionLevel: city.tier === 1 ? 0 : 1,
      distributionType: "exclusive",
      distributorProfile: "direct"
    };
  }

  if (features.priceSegment === "premium") {
    if (city.tier === 1) {
      return {
        distributionLevel: 1,
        distributionType: "selective",
        distributorProfile: "retailer"
      };
    }

    if (city.tier === 2) {
      return {
        distributionLevel: 1,
        distributionType: "selective",
        distributorProfile: "broker-agent"
      };
    }

    return {
      distributionLevel: 2,
      distributionType: "selective",
      distributorProfile: "wholesaler"
    };
  }

  if (features.priceSegment === "mid") {
    if (city.tier === 1) {
      return {
        distributionLevel: 1,
        distributionType: "selective",
        distributorProfile: "retailer"
      };
    }

    return {
      distributionLevel: 2,
      distributionType: city.tier === 2 ? "selective" : "intensive",
      distributorProfile: "wholesaler"
    };
  }

  if (city.tier === 1) {
    return {
      distributionLevel: 2,
      distributionType: "intensive",
      distributorProfile: "wholesaler"
    };
  }

  return {
    distributionLevel: 3,
    distributionType: "intensive",
    distributorProfile: "broker-agent"
  };
}

function getRecommendation(
  band: ScoreBand,
  distributionType: DistributionType
): string {
  if (band === "PRIME" && distributionType === "exclusive") {
    return "Priority launch city. Open brand boutique or exclusive retail partnership immediately.";
  }

  if (band === "PRIME" && distributionType === "selective") {
    return "Lead market. Activate modern trade and quick commerce simultaneously.";
  }

  if (band === "PRIME" && distributionType === "intensive") {
    return "Maximum volume potential. Deploy full wholesaler network on day one.";
  }

  if (band === "STRONG") {
    return "Phase 2 entry. Enter 60 days after lead markets stabilize.";
  }

  if (band === "MODERATE") {
    return "Test market. Limited SKUs, monitor 90 days before scaling.";
  }

  return "Defer. Revisit in 12-18 months.";
}

export function mapCategoryToKey(category: string): string {
  const cat = category.toLowerCase();
  if (cat.includes("energy") || cat.includes("beverage")) {
    if (cat.includes("premium") || cat.includes("craft")) 
      return "premium_beverage";
    return "mass_fmcg";
  }
  if (cat.includes("skin") || cat.includes("beauty") || 
      cat.includes("cosmetic")) return "d2c_skincare";
  if (cat.includes("dairy") || cat.includes("milk")) return "dairy";
  if (cat.includes("electronic") || cat.includes("phone") || 
      cat.includes("laptop")) return "electronics";
  if (cat.includes("luxury") || cat.includes("watch") || 
      cat.includes("handbag")) return "luxury";
  if (cat.includes("agri") || cat.includes("farm") || 
      cat.includes("pesticide") || cat.includes("fertiliser")) 
    return "agri_input";
  if (cat.includes("health") || cat.includes("supplement") || 
      cat.includes("protein")) return "health_wellness";
  return "mass_fmcg";
}

export function scoreCities(features: ExtractedFeatures): ScoredCity[] {
  return cityData
    .map((city) => {
      let adjustedRetailWeight = features.retailWeight;
      let adjustedColdWeight = features.coldWeight;

      if (!features.needsColdChain) {
        adjustedRetailWeight += adjustedColdWeight;
        adjustedColdWeight = 0;
      }

      const adjustedIncome = Math.min(Math.max(city.income + (city.incomeScoreAdjustment ?? 0), 0), 100);
      const adjustedRetail = Math.min(Math.max(city.retail + (city.retailScoreAdjustment ?? 0), 0), 100);
      const adjustedInternet = Math.min(Math.max(city.internet + (city.internetScoreAdjustment ?? 0), 0), 100);
      const adjustedCold = Math.min(Math.max(city.cold + (city.coldScoreAdjustment ?? 0), 0), 100);

      let raw =
        adjustedIncome * features.incomeWeight +
        adjustedRetail * adjustedRetailWeight +
        adjustedInternet * features.internetWeight +
        adjustedCold * adjustedColdWeight;

      raw *= features.affordability;

      if (city.tier === 1) {
        raw *= 1.05;
      }

      const isMassIntensive = 
        features.priceSegment === 'mass' && 
        features.distributionType === 'intensive';

      if (city.tier === 3 && !isMassIntensive) raw *= 0.92;

      const cityHasStrongColdChain = city.cold > 85;
      const productNeedsColdChain = 
        features.needsColdChain === true && 
        features.coldWeight > 0.25;

      if (cityHasStrongColdChain && productNeedsColdChain) {
        raw *= 1.03;
      }

      raw += Math.min(city.population * 0.3, 5);

      if (features.distributionType === "exclusive") {
        if (city.tier === 3) {
          raw *= 0.65;
        }

        if (city.tier === 2) {
          raw *= 0.82;
        }
      }

      if (features.distributionType === "intensive" && city.retail > 80) {
        raw *= 1.04;
      }

      // Competitor saturation penalty
      const productCategoryKey = mapCategoryToKey(features.category);
      const saturation = city.competitorSaturation?.[productCategoryKey];
      if (saturation === "high" && features.priceSegment !== "mass") {
        raw *= 0.94;
      }
      if (
        saturation === "medium" &&
        (features.priceSegment === "premium" ||
          features.priceSegment === "luxury")
      ) {
        raw *= 0.97;
      }

      const score = Math.min(Math.round(raw), 100);
      const band = getBand(score);
      const architecture = getCityArchitecture(features, city);
      const demand = Math.round(
        (score / 100) * city.population * baseUnitsBySegment[features.priceSegment]
      );

      return {
        ...city,
        score,
        demand,
        demandLow: Math.round(demand * 0.6),
        demandHigh: Math.round(demand * 1.5),
        band,
        scoreBreakdown: {
          incomeContribution: Math.round(
            adjustedIncome * features.incomeWeight * features.affordability
          ),
          retailContribution: Math.round(
            adjustedRetail * adjustedRetailWeight * features.affordability
          ),
          internetContribution: Math.round(
            adjustedInternet * features.internetWeight * features.affordability
          ),
          coldContribution: Math.round(
            adjustedCold * adjustedColdWeight * features.affordability
          )
        },
        distributionLevel: architecture.distributionLevel,
        distributionType: architecture.distributionType,
        distributorProfile: architecture.distributorProfile,
        cityRecommendation: getRecommendation(
          band,
          architecture.distributionType
        ),
        recentDevelopments: city.recentDevelopments ?? [],
        competitorSaturation: city.competitorSaturation ?? {},
        lastEnriched: city.lastEnriched ?? ""
      };
    })
    .sort((a, b) => b.score - a.score);
}

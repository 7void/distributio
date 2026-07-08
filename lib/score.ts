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

export function scoreCities(features: ExtractedFeatures): ScoredCity[] {
  return cityData
    .map((city) => {
      let adjustedRetailWeight = features.retailWeight;
      let adjustedColdWeight = features.coldWeight;

      if (!features.needsColdChain) {
        adjustedRetailWeight += adjustedColdWeight;
        adjustedColdWeight = 0;
      }

      let raw =
        city.income * features.incomeWeight +
        city.retail * adjustedRetailWeight +
        city.internet * features.internetWeight +
        city.cold * adjustedColdWeight;

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
            city.income * features.incomeWeight * features.affordability
          ),
          retailContribution: Math.round(
            city.retail * adjustedRetailWeight * features.affordability
          ),
          internetContribution: Math.round(
            city.internet * features.internetWeight * features.affordability
          ),
          coldContribution: Math.round(
            city.cold * adjustedColdWeight * features.affordability
          )
        },
        distributionLevel: architecture.distributionLevel,
        distributionType: architecture.distributionType,
        distributorProfile: architecture.distributorProfile,
        cityRecommendation: getRecommendation(
          band,
          architecture.distributionType
        )
      };
    })
    .sort((a, b) => b.score - a.score);
}

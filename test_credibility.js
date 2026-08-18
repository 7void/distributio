import { scoreCities } from "./lib/score.ts";
import cities from "./data/cities.json" assert { type: "json" };

console.log("\n=======================================================");
console.log(" SANITY CHECK: CREDIBILITY TESTING OF ENGINEERED LOGIC ");
console.log("=======================================================\n");

// --- SCENARIO 1: MASS MARKET STAPLE ---
// A ₹15 pack of biscuits. High volume, mass market, needs deep intensive distribution.
const massProduct = {
  features: {
    priceINR: 15,
    priceSegment: "mass",
    distributionType: "intensive",
    channels: ["Kirana / General Stores", "Modern Trade / Supermarkets"],
    needsColdChain: false,
    incomeWeight: 0.3,
    retailWeight: 0.4,
    internetWeight: 0.05,
    coldWeight: 0,
    logisticsWeight: 0.25
  },
  profile: {
    marginPercent: 20, // Low margin
    launchBudgetINR: "₹5L – ₹20L",
    brandMaturity: "established"
  }
};

console.log("▶ TEST 1: Mass Market Staple (e.g., ₹15 Biscuits)");
console.log("  Expectation: Should favor high-population, high-retail-density cities, even in Tier-2/3.");
const massResults = scoreCities(massProduct.features, massProduct.profile).slice(0, 3);
massResults.forEach(c => console.log(`  - ${c.name} (Tier ${c.tier}) | Score: ${c.score} | Demand: ${c.demand}`));


// --- SCENARIO 2: LUXURY PRODUCT ---
// A ₹25,000 Swiss Watch. Exclusive distribution, high margin, low volume.
const luxuryProduct = {
  features: {
    priceINR: 25000,
    priceSegment: "luxury",
    distributionType: "exclusive",
    channels: ["Specialty Retail", "D2C Website"],
    needsColdChain: false,
    affordability: 0.4, // Extremely poor affordability for general population
    incomeWeight: 0.5,
    retailWeight: 0.2,
    internetWeight: 0.2,
    coldWeight: 0,
    logisticsWeight: 0.1
  },
  profile: {
    marginPercent: 60, // High margin
    launchBudgetINR: "₹20L – ₹1Cr",
    brandMaturity: "new"
  }
};

console.log("\n▶ TEST 2: Luxury Product (e.g., ₹25,000 Swiss Watch)");
console.log("  Expectation: Should strictly favor Tier-1 Metros due to income/affordability gates. Tier-3 should fail.");
const luxuryResults = scoreCities(luxuryProduct.features, luxuryProduct.profile).slice(0, 3);
luxuryResults.forEach(c => console.log(`  - ${c.name} (Tier ${c.tier}) | Score: ${c.score} | Demand: ${c.demand}`));


// --- SCENARIO 3: D2C COLD-CHAIN PRODUCT ---
// A ₹250 Premium Kombucha. Sold only online, requires refrigeration.
const d2cProduct = {
  features: {
    priceINR: 250,
    priceSegment: "premium",
    distributionType: "selective",
    channels: ["D2C Website", "Quick Commerce"],
    needsColdChain: true,
    affordability: 0.8,
    incomeWeight: 0.2,
    retailWeight: 0.1,
    internetWeight: 0.4,
    coldWeight: 0.2,
    logisticsWeight: 0.1
  },
  profile: {
    marginPercent: 40,
    launchBudgetINR: "₹1L – ₹5L",
    brandMaturity: "emerging",
    hasDistributor: "direct"
  }
};

console.log("\n▶ TEST 3: D2C Cold-Chain Product (e.g., ₹250 Premium Kombucha)");
console.log("  Expectation: Should favor cities with top-tier internet & cold-chain infra (usually Metros/Major Hubs).");
const d2cResults = scoreCities(d2cProduct.features, d2cProduct.profile).slice(0, 3);
d2cResults.forEach(c => console.log(`  - ${c.name} (Tier ${c.tier}) | Score: ${c.score} | Demand: ${c.demand}`));

console.log("\n");

import { scoreCities } from "../lib/score";
import type { ExtractedFeatures, ProductProfile } from "../lib/types";
import citiesRaw from "../data/cities.json";

const cities = citiesRaw as any[];

// Epigamia — using exact Gemini-extracted weights from the unbiased run
const features: ExtractedFeatures = {
  productName: "Epigamia Greek Yogurt",
  category: "Dairy", priceINR: 70, priceSegment: "premium",
  incomeWeight: 0.32, retailWeight: 0.22, internetWeight: 0.26,
  coldWeight: 0.12, logisticsWeight: 0.08, affordability: 0.85,
  targetAudience: "Premium urban consumers", needsColdChain: true,
  distributionLevel: 1, distributionType: "selective",
  distributorProfile: "retailer",
  channels: ["Modern Trade","Quick Commerce"],
  keyInsight: "Premium cold-chain dairy", seasonality: "No seasonal bias"
};

const profile: Partial<ProductProfile> = {
  priceINR: 70, marginPercent: 35, brandMaturity: "emerging",
  warehouseCity: "Mumbai", deliveryRadiusKM: 1000,
  incomeTarget: "premium", preferredChannels: ["Modern Trade","Quick Commerce"],
  hasDistributor: "yes", primaryGoal: "revenue",
  launchBudgetINR: "Rs5L - Rs20L", preferredRegion: "all"
};

const scored = scoreCities(features, profile as any, undefined, cities);

console.log("=== EPIGAMIA — Score Breakdown (after hub-and-spoke fix) ===\n");
const targetCities = ["Mumbai","Bengaluru","Delhi","Hyderabad","Chennai","Pune","Surat","Nashik","Ahmedabad","Vadodara"];
for (const name of targetCities) {
  const c = scored.find((x: any) => x.name === name);
  if (!c) continue;
  console.log(`${c.name.padEnd(12)} | Score: ${String(c.score).padStart(3)} | Band: ${c.band.padEnd(10)} | LogisticsCost: Rs${c.logisticsCostPerUnit} | MarginPerUnit: Rs${c.marginPerUnit} | BreakEven: ${c.breakEvenUnits}`);
}

console.log(`\nPredicted top 6: ${scored.slice(0,6).map((c:any)=>c.name).join(", ")}`);
console.log(`Actual top 6:    Mumbai, Bengaluru, Delhi, Hyderabad, Chennai, Pune`);

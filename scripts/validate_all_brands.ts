import { scoreCities } from "../lib/score";
import type { ExtractedFeatures, ProductProfile } from "../lib/types";
import citiesRaw from "../data/cities.json";
import dataset from "../data/real_companies_dataset.json";

const cities = citiesRaw as any[];

// ── Precision@6: what % of actual top cities did the model correctly find? ────
function precisionAtK(actual: string[], predicted: string[], k = 6): number {
  const actualSet = new Set(actual.slice(0, k));
  const hits = predicted.slice(0, k).filter(c => actualSet.has(c)).length;
  return hits / k;
}

// ── Spearman on the intersection (only cities both lists share) ───────────────
function spearmanIntersection(actual: string[], predicted: string[]): number {
  const shared = actual.filter(c => predicted.includes(c));
  if (shared.length < 2) return 0;
  const n = shared.length;
  let sumD2 = 0;
  for (const city of shared) {
    const ra = actual.indexOf(city);
    const rp = predicted.indexOf(city);
    const di = ra - rp;
    sumD2 += di * di;
  }
  return 1 - (6 * sumD2) / (n * (n * n - 1));
}

// ── Avoid-city check ──────────────────────────────────────────────────────────
function checkAvoid(scored: any[], avoidList: string[]): { correct: number; total: number } {
  let correct = 0;
  for (const name of avoidList) {
    const city = scored.find((c: any) => c.name === name);
    if (city && (city.band === "AVOID" || city.band === "WEAK")) correct++;
  }
  return { correct, total: avoidList.length };
}

console.log("=".repeat(80));
console.log("  DISTRIBUTIO — FULL BACKTEST VALIDATION SUITE (10 real-world companies)");
console.log("=".repeat(80));
console.log("");

type BrandResult = {
  brand: string;
  p6: number;
  rho: number;
  avoidAcc: string;
  pass: boolean;
};
const results: BrandResult[] = [];

for (const entry of dataset as any[]) {
  const features: ExtractedFeatures = {
    productName:       entry.brand,
    category:          entry.product,
    priceINR:          entry.priceINR,
    priceSegment:      entry.priceSegment,
    incomeWeight:      entry.incomeWeight,
    retailWeight:      entry.retailWeight,
    internetWeight:    entry.internetWeight,
    coldWeight:        entry.coldWeight,
    logisticsWeight:   entry.logisticsWeight,
    affordability:     entry.affordability,
    targetAudience:    entry.brand,
    needsColdChain:    entry.needsColdChain,
    distributionLevel: entry.distributionType === "exclusive" ? 0 : entry.distributionType === "selective" ? 1 : 2,
    distributionType:  entry.distributionType,
    distributorProfile: entry.hasDistributor === "direct" ? "direct" : "retailer",
    channels:          entry.channels,
    keyInsight:        entry.brand,
    seasonality:       "No seasonal bias"
  };

  const profile: Partial<ProductProfile> = {
    priceINR:          entry.priceINR,
    marginPercent:     entry.marginPercent,
    brandMaturity:     entry.brandMaturity,
    warehouseCity:     entry.warehouseCity,
    deliveryRadiusKM:  entry.deliveryRadiusKM,
    incomeTarget:      entry.incomeTarget,
    preferredChannels: entry.channels,
    hasDistributor:    entry.hasDistributor,
    primaryGoal:       entry.primaryGoal,
    launchBudgetINR:   entry.launchBudgetINR,
    preferredRegion:   "all"
  };

  const scored = scoreCities(features, profile as any, undefined, cities);
  const predictedTop6 = scored.slice(0, 6).map((c: any) => c.name);

  const p6  = precisionAtK(entry.actualTop6, predictedTop6, 6);
  const rho = spearmanIntersection(entry.actualTop6, predictedTop6);
  const avoid = checkAvoid(scored, entry.actualAvoid);

  // Pass = Precision@6 >= 50% AND avoid accuracy >= 60%
  const pass = p6 >= 0.5 && avoid.correct >= Math.ceil(avoid.total * 0.6);

  results.push({ brand: entry.brand, p6: Math.round(p6 * 100), rho: Math.round(rho * 100) / 100, avoidAcc: `${avoid.correct}/${avoid.total}`, pass });

  console.log(`Brand   : ${entry.brand}`);
  console.log(`Source  : ${entry.source}`);
  console.log(`Actual  : ${entry.actualTop6.join(", ")}`);
  console.log(`Predicted: ${predictedTop6.join(", ")}`);
  console.log(`Precision@6: ${Math.round(p6*100)}%  |  Spearman rho (intersection): ${(Math.round(rho*100)/100).toFixed(2)}  |  Avoid: ${avoid.correct}/${avoid.total}  |  ${pass ? "✓ PASS" : "✗ FAIL"}`);
  console.log("-".repeat(80));
}

const passed = results.filter(r => r.pass).length;
const avgP6  = results.reduce((s, r) => s + r.p6, 0) / results.length;
const avgRho = results.reduce((s, r) => s + r.rho, 0) / results.length;

console.log("");
console.log("=".repeat(80));
console.log(`  SUMMARY:  ${passed}/${results.length} PASSED`);
console.log(`  Mean Precision@6 = ${avgP6.toFixed(1)}%   |   Mean Spearman rho = ${avgRho.toFixed(2)}`);
console.log("=".repeat(80));
results.forEach(r => {
  const status = r.pass ? "PASS" : "FAIL";
  console.log(`  ${status} | P@6=${r.p6}% | rho=${r.rho.toFixed(2)} | Avoid=${r.avoidAcc} | ${r.brand}`);
});

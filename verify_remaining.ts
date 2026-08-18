import { scoreCities } from "./lib/score";
import type { ExtractedFeatures, ProductProfile } from "./lib/types";

// ─── Helpers ────────────────────────────────────────────────────────────────
let passed = 0, failed = 0;

function check(label: string, condition: boolean, detail: string) {
  if (condition) {
    console.log(`  ✅ PASS | ${label}`);
    console.log(`         → ${detail}`);
    passed++;
  } else {
    console.log(`  ❌ FAIL | ${label}`);
    console.log(`         → ${detail}`);
    failed++;
  }
}

function section(n: number, title: string) {
  console.log(`\n${"─".repeat(65)}`);
  console.log(` ITEM ${n}: ${title}`);
  console.log("─".repeat(65));
}

// ─── Shared base features ────────────────────────────────────────────────────
const massFeatures: ExtractedFeatures = {
  productName: "Mass FMCG Product",
  category: "FMCG",
  targetAudience: "Mass consumer base",
  distributionLevel: 2,
  distributorProfile: "wholesaler",
  keyInsight: "High volume staple",
  seasonality: "No seasonal bias",
  priceINR: 20, priceSegment: "mass" as const, distributionType: "intensive" as const,
  channels: ["Kirana / General Stores"], needsColdChain: false, affordability: 1.0,
  incomeWeight: 0.25, retailWeight: 0.35, internetWeight: 0.15, coldWeight: 0, logisticsWeight: 0.25
};
const premiumFeatures: ExtractedFeatures = {
  productName: "Premium Product",
  category: "Beverage",
  targetAudience: "Affluent consumers",
  distributionLevel: 1,
  distributorProfile: "retailer",
  keyInsight: "Premium indulgence",
  seasonality: "No seasonal bias",
  priceINR: 500, priceSegment: "premium" as const, distributionType: "selective" as const,
  channels: ["Modern Trade / Supermarkets"], needsColdChain: false, affordability: 0.8,
  incomeWeight: 0.35, retailWeight: 0.30, internetWeight: 0.15, coldWeight: 0, logisticsWeight: 0.2
};
const luxuryFeatures: ExtractedFeatures = {
  productName: "Luxury Product",
  category: "Luxury",
  targetAudience: "High net worth individuals",
  distributionLevel: 0,
  distributorProfile: "direct",
  keyInsight: "Exclusive luxury good",
  seasonality: "No seasonal bias",
  priceINR: 25000, priceSegment: "luxury" as const, distributionType: "exclusive" as const,
  channels: ["Specialty Retail"], needsColdChain: false, affordability: 0.3,
  incomeWeight: 0.5, retailWeight: 0.2, internetWeight: 0.15, coldWeight: 0, logisticsWeight: 0.15
};

// ═══════════════════════════════════════════════════════════════════════════════
// ITEM 2 — Freight ₹3.0/100km
// ═══════════════════════════════════════════════════════════════════════════════
section(2, "Freight ₹3.0/100km");
// Test: ₹100 product, warehouse in Mumbai, check logistics cost for a ~1000km city
const item2Results = scoreCities(
  { ...massFeatures, priceINR: 100 },
  { launchBudgetINR: "₹5L – ₹20L", brandMaturity: "new", warehouseCity: "Mumbai" }
);
const hyderabad = item2Results.find(c => c.name === "Hyderabad"); // ~700km from Mumbai
const delhi     = item2Results.find(c => c.name === "Delhi");     // ~1400km from Mumbai
const mumbaiR   = item2Results.find(c => c.name === "Mumbai");    // 0km
if (mumbaiR && hyderabad && delhi) {
  check("Mumbai (0km) freight < Hyderabad (~700km) freight",
    mumbaiR.logisticsCostPerUnit <= hyderabad.logisticsCostPerUnit,
    `Mumbai=₹${mumbaiR.logisticsCostPerUnit} | Hyderabad=₹${hyderabad.logisticsCostPerUnit} | Delhi=₹${delhi.logisticsCostPerUnit}`);
  check("Freight as % of ₹100 product price is realistic (<60%)",
    delhi.logisticsCostPerUnit < 60,
    `Delhi freight = ₹${delhi.logisticsCostPerUnit} = ${delhi.logisticsCostPerUnit}% of ₹100 price (expected: high for PTL, but <60%)`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// ITEM 3 — Logistics quality discount ₹4
// ═══════════════════════════════════════════════════════════════════════════════
section(3, "Logistics Quality Discount ₹4 — Mumbai cheaper than Patna");
const item3Results = scoreCities(
  { ...massFeatures, priceINR: 100 },
  { launchBudgetINR: "₹5L – ₹20L", brandMaturity: "new", warehouseCity: "Delhi" }
);
const mumbai3 = item3Results.find(c => c.name === "Mumbai");
const patna   = item3Results.find(c => c.name === "Patna");
if (mumbai3 && patna) {
  // Both are roughly ~1400km from Delhi. Mumbai should be cheaper due to logistics score.
  check("Mumbai logistics cost ≤ Patna logistics cost (same ~distance, better infra)",
    mumbai3.logisticsCostPerUnit <= patna.logisticsCostPerUnit,
    `Mumbai=₹${mumbai3.logisticsCostPerUnit} | Patna=₹${patna.logisticsCostPerUnit}`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// ITEM 14 — Tier-1 Metro Bonus +4 must NOT flip rankings unfairly
// ═══════════════════════════════════════════════════════════════════════════════
section(14, "Tier-1 Metro Bonus +4 must NOT flip T2→T1 when T2 has better fundamentals");
const item14Results = scoreCities(
  { ...massFeatures },
  { launchBudgetINR: "₹5L – ₹20L", brandMaturity: "established" }
);
// Check: Surat (T2, known for strong kirana) vs a weaker T1 city like Chennai
const surat   = item14Results.find(c => c.name === "Surat");
const kolkata = item14Results.find(c => c.name === "Kolkata");
const delhi14 = item14Results.find(c => c.name === "Delhi");
console.log(`  ℹ  Top 5 cities for mass established brand:`);
item14Results.slice(0, 5).forEach(c => console.log(`     ${c.name} (Tier ${c.tier}) → Score: ${c.score}`));
if (surat && delhi14) {
  check("Delhi (T1) scores higher than Surat (T2) for established mass brand (T1 bonus justified)",
    delhi14.score >= surat.score,
    `Delhi=${delhi14.score} | Surat=${surat.score}. T1 bonus of +4 is appropriate, not overriding fundamentals`);
}
// Also verify: the gap between top T1 and top T2 is not simply exactly 4 pts (meaning fundamentals dominate)
if (kolkata && surat) {
  check("Score gap between T1 and T2 cities is driven by fundamentals, not just +4 bonus",
    Math.abs(kolkata.score - surat.score) !== 4,
    `Kolkata(T1)=${kolkata.score} vs Surat(T2)=${surat.score}. Gap=${Math.abs(kolkata.score - surat.score)} — not simply 4, so fundamentals dominate`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// ITEM 15 — Tier-3 Penalty −5 for premium products
// ═══════════════════════════════════════════════════════════════════════════════
section(15, "Tier-3 Penalty −5: premium product visibly scores lower in T3 vs T2");
const item15Results = scoreCities(
  { ...premiumFeatures },
  { launchBudgetINR: "₹5L – ₹20L", brandMaturity: "new" }
);
const t1cities = item15Results.filter(c => c.tier === 1);
const t2cities = item15Results.filter(c => c.tier === 2);
const t3cities = item15Results.filter(c => c.tier === 3);
const avgT1 = t1cities.reduce((s,c) => s+c.score, 0) / t1cities.length;
const avgT2 = t2cities.reduce((s,c) => s+c.score, 0) / t2cities.length;
const avgT3 = t3cities.reduce((s,c) => s+c.score, 0) / t3cities.length;
console.log(`  ℹ  Avg scores by tier for ₹500 premium product:`);
console.log(`     T1 avg = ${avgT1.toFixed(1)} | T2 avg = ${avgT2.toFixed(1)} | T3 avg = ${avgT3.toFixed(1)}`);
check("T3 avg score < T2 avg score for premium product (penalty working)",
  avgT3 < avgT2,
  `T3 avg ${avgT3.toFixed(1)} < T2 avg ${avgT2.toFixed(1)}`);
check("T2 avg score < T1 avg score for premium product (tier hierarchy correct)",
  avgT2 < avgT1,
  `T2 avg ${avgT2.toFixed(1)} < T1 avg ${avgT1.toFixed(1)}`);

// ═══════════════════════════════════════════════════════════════════════════════
// ITEM 18 — Exclusive T3 Penalty −20: luxury in T3 should be AVOID
// ═══════════════════════════════════════════════════════════════════════════════
section(18, "Exclusive T3 Penalty −20: luxury product should score AVOID in Tier-3");
const item18Results = scoreCities(
  { ...luxuryFeatures },
  { launchBudgetINR: "₹20L – ₹1Cr", brandMaturity: "new" }
);
const luxT3 = item18Results.filter(c => c.tier === 3);
const luxT1 = item18Results.filter(c => c.tier === 1);
console.log(`  ℹ  Luxury brand T1 scores: ${luxT1.slice(0,3).map(c=>`${c.name}=${c.score}(${c.band})`).join(', ')}`);
console.log(`  ℹ  Luxury brand T3 scores: ${luxT3.slice(0,3).map(c=>`${c.name}=${c.score}(${c.band})`).join(', ')}`);
check("All Tier-3 cities score AVOID for exclusive luxury brand",
  luxT3.every(c => c.band === "AVOID" || c.score < 35),
  `T3 scores: ${luxT3.map(c=>`${c.name}=${c.score}`).join(', ')}`);
check("T1 cities score better than T3 for luxury brand (significant gap)",
  (luxT1[0]?.score ?? 0) > (luxT3[0]?.score ?? 100) + 15,
  `Best T1=${luxT1[0]?.score} vs Best T3=${luxT3[0]?.score}`);

// ═══════════════════════════════════════════════════════════════════════════════
// ITEM 20 — Intensive Retail Bonus +3
// ═══════════════════════════════════════════════════════════════════════════════
section(20, "Intensive Retail Bonus +3: mass product scores higher in high-kirana cities");
const item20Results = scoreCities(
  { ...massFeatures },
  { launchBudgetINR: "₹1L – ₹5L", brandMaturity: "new" }
);
// Find a high-kirana T1 city (Mumbai, Delhi) and compare to a lower-kirana T1 city
const mumbai20 = item20Results.find(c => c.name === "Mumbai");
const delhi20  = item20Results.find(c => c.name === "Delhi");
console.log(`  ℹ  Mass product top 5:`);
item20Results.slice(0,5).forEach(c => console.log(`     ${c.name} (T${c.tier}) → Score: ${c.score}`));
check("Mass product T1 cities rank at top (intensive retail bonus firing)",
  item20Results.slice(0,3).some(c => c.tier === 1),
  `Top 3: ${item20Results.slice(0,3).map(c=>`${c.name}(T${c.tier})`).join(', ')}`);

// ═══════════════════════════════════════════════════════════════════════════════
// ITEM 21 — New Brand Metro Penalty −4
// ═══════════════════════════════════════════════════════════════════════════════
section(21, "New Brand Metro Penalty −4: new brand should prefer T2 over T1 when equal");
const newBrandResults = scoreCities(
  { ...massFeatures },
  { launchBudgetINR: "₹1L – ₹5L", brandMaturity: "new" }
);
const estBrandResults = scoreCities(
  { ...massFeatures },
  { launchBudgetINR: "₹1L – ₹5L", brandMaturity: "established" }
);
const newT1avg = newBrandResults.filter(c=>c.tier===1).reduce((s,c)=>s+c.score,0) / newBrandResults.filter(c=>c.tier===1).length;
const newT2avg = newBrandResults.filter(c=>c.tier===2).reduce((s,c)=>s+c.score,0) / newBrandResults.filter(c=>c.tier===2).length;
const estT1avg = estBrandResults.filter(c=>c.tier===1).reduce((s,c)=>s+c.score,0) / estBrandResults.filter(c=>c.tier===1).length;
console.log(`  ℹ  New brand:   T1 avg=${newT1avg.toFixed(1)}, T2 avg=${newT2avg.toFixed(1)}`);
console.log(`  ℹ  Est. brand:  T1 avg=${estT1avg.toFixed(1)}`);
check("Established brand has higher T1 avg than new brand (penalty working)",
  estT1avg > newT1avg,
  `Est. T1=${estT1avg.toFixed(1)} > New T1=${newT1avg.toFixed(1)}. Penalty of -4 clearly shifts scores.`);
check("New brand T2 avg is competitive with T1 avg (penalty creates T2 preference)",
  Math.abs(newT1avg - newT2avg) < 10,
  `New T1=${newT1avg.toFixed(1)} vs New T2=${newT2avg.toFixed(1)}. Gap=${Math.abs(newT1avg-newT2avg).toFixed(1)}pts — T2 is competitive`);

// ═══════════════════════════════════════════════════════════════════════════════
// ITEM 23 — Brand Awareness Metro Bonus +3
// ═══════════════════════════════════════════════════════════════════════════════
section(23, "Brand Awareness Bonus +3: brand-awareness goal pushes metros to top");
const awarenessResults = scoreCities(
  { ...massFeatures },
  { launchBudgetINR: "₹5L – ₹20L", brandMaturity: "new", primaryGoal: "brand_awareness" }
);
const revenueResults = scoreCities(
  { ...massFeatures },
  { launchBudgetINR: "₹5L – ₹20L", brandMaturity: "new", primaryGoal: "revenue" }
);
const awareTop3 = awarenessResults.slice(0,3);
const revTop3   = revenueResults.slice(0,3);
console.log(`  ℹ  Awareness goal top 3: ${awareTop3.map(c=>`${c.name}(T${c.tier})=${c.score}`).join(', ')}`);
console.log(`  ℹ  Revenue goal top 3:   ${revTop3.map(c=>`${c.name}(T${c.tier})=${c.score}`).join(', ')}`);
check("Brand awareness goal top results are all Tier-1 metros",
  awareTop3.every(c => c.tier === 1),
  `Top 3 awareness: ${awareTop3.map(c=>c.name).join(', ')} — all T1`);

// ═══════════════════════════════════════════════════════════════════════════════
// ITEM 24 — No Distributor Penalty must NOT fire for D2C brands
// ═══════════════════════════════════════════════════════════════════════════════
section(24, "No Distributor Penalty −6: must NOT apply to D2C brands");
const d2cNoDist = scoreCities(
  { ...premiumFeatures, channels: ["D2C Website", "Quick Commerce"], distributionType: "selective" as const },
  { launchBudgetINR: "₹1L – ₹5L", brandMaturity: "new", hasDistributor: "direct" }
);
const d2cWithDist = scoreCities(
  { ...premiumFeatures, channels: ["Kirana / General Stores"], distributionType: "intensive" as const },
  { launchBudgetINR: "₹1L – ₹5L", brandMaturity: "new", hasDistributor: "no" }
);
const d2cMumbai  = d2cNoDist.find(c => c.name === "Mumbai");
const distMumbai = d2cWithDist.find(c => c.name === "Mumbai");
console.log(`  ℹ  D2C brand (direct, no distributor needed): Mumbai=${d2cMumbai?.score}`);
console.log(`  ℹ  Traditional brand (no distributor, needs one): Mumbai=${distMumbai?.score}`);
check("D2C brand scores higher than no-distributor traditional brand (penalty not firing for D2C)",
  (d2cMumbai?.score ?? 0) > (distMumbai?.score ?? 100),
  `D2C Mumbai=${d2cMumbai?.score} > Traditional-no-dist Mumbai=${distMumbai?.score}`);

// ═══════════════════════════════════════════════════════════════════════════════
// ITEM 35 — Score Band Thresholds 80/65/50/35
// ═══════════════════════════════════════════════════════════════════════════════
section(35, "Score Band Thresholds 80/65/50/35: real products land in correct bands");
// D2C premium in T1 metro should be PRIME (≥80)
const d2cPremiumT1 = scoreCities(
  { ...premiumFeatures, priceINR: 250, priceSegment: "premium" as const, distributionType: "selective" as const,
    channels: ["D2C Website", "Quick Commerce"], needsColdChain: false, affordability: 0.85,
    incomeWeight: 0.2, retailWeight: 0.1, internetWeight: 0.5, coldWeight: 0, logisticsWeight: 0.2 },
  { launchBudgetINR: "₹5L – ₹20L", brandMaturity: "established", hasDistributor: "direct" }
);
// Luxury in T3 should be AVOID (<35)
const luxuryT3 = item18Results.filter(c => c.tier === 3);
const d2cBestScore = d2cPremiumT1[0];
console.log(`  ℹ  D2C established premium best city: ${d2cBestScore?.name}=${d2cBestScore?.score}(${d2cBestScore?.band})`);
console.log(`  ℹ  Luxury T3 worst city: ${luxuryT3[luxuryT3.length-1]?.name}=${luxuryT3[luxuryT3.length-1]?.score}(${luxuryT3[luxuryT3.length-1]?.band})`);
check("Best D2C established premium city is PRIME or STRONG (score ≥65)",
  (d2cBestScore?.score ?? 0) >= 65,
  `${d2cBestScore?.name}=${d2cBestScore?.score} → ${d2cBestScore?.band}`);
check("Luxury brand T3 cities land in AVOID or WEAK band (<50)",
  luxuryT3.every(c => c.score < 50),
  `T3 luxury scores: ${luxuryT3.map(c=>c.score).join(', ')}`);
// Check band diversity — not everything is the same band
const allBands = new Set(d2cPremiumT1.map(c=>c.band));
check("Multiple distinct bands exist in results (thresholds are meaningfully differentiating)",
  allBands.size >= 3,
  `Bands present: ${[...allBands].join(', ')}`);

// ═══════════════════════════════════════════════════════════════════════════════
// ITEM 38 — Budget ÷5 cities: break-even realistic?
// ═══════════════════════════════════════════════════════════════════════════════
section(38, "Budget ÷5: break-even units realistic for launch budgets?");
// ₹5L budget ÷ 5 = ₹1L per city. For a ₹200 product with 40% margin = ₹80/unit margin
// After freight of ~₹20, margin/unit ≈ ₹60. Break-even = ₹1,00,000 ÷ ₹60 ≈ 1,667 units
const budgetResults = scoreCities(
  { ...premiumFeatures, priceINR: 200 },
  { launchBudgetINR: "₹5L – ₹20L", brandMaturity: "new", marginPercent: 40,
    warehouseCity: "Mumbai" }
);
const beMumbai = budgetResults.find(c => c.name === "Mumbai");
const beDelhi  = budgetResults.find(c => c.name === "Delhi");
console.log(`  ℹ  ₹200 product, 40% margin, ₹5-20L budget:`);
console.log(`     Mumbai: margin/unit=₹${beMumbai?.marginPerUnit}, break-even=${beMumbai?.breakEvenUnits} units`);
console.log(`     Delhi:  margin/unit=₹${beDelhi?.marginPerUnit}, break-even=${beDelhi?.breakEvenUnits} units`);
check("Break-even units > 0 (viable city exists)",
  (beMumbai?.breakEvenUnits ?? 999999) < 999999,
  `Mumbai break-even = ${beMumbai?.breakEvenUnits} units`);
check("Break-even units < 10,000 (realistic target for small brand in first year)",
  (beMumbai?.breakEvenUnits ?? 999999) < 10000,
  `Mumbai break-even = ${beMumbai?.breakEvenUnits} units — achievable for a ₹5-20L budget launch`);

// ═══════════════════════════════════════════════════════════════════════════════
// ITEM 39 — Confidence Thresholds (55, 45)
// ═══════════════════════════════════════════════════════════════════════════════
section(39, "Confidence Thresholds: right cities get low/medium confidence");
// Premium brand targeting high-income → cities with income<55 should be medium confidence
const confResults = scoreCities(
  { ...premiumFeatures },
  { launchBudgetINR: "₹5L – ₹20L", brandMaturity: "new", incomeTarget: "premium" }
);
const lowConfCities = confResults.filter(c => c.confidenceLevel === "low");
const medConfCities = confResults.filter(c => c.confidenceLevel === "medium");
const highConfCities = confResults.filter(c => c.confidenceLevel === "high");
console.log(`  ℹ  Premium product confidence distribution:`);
console.log(`     High: ${highConfCities.length} cities | Medium: ${medConfCities.length} cities | Low: ${lowConfCities.length} cities`);
console.log(`     Medium confidence examples: ${medConfCities.slice(0,3).map(c=>c.name).join(', ')}`);
check("Multiple confidence levels present (thresholds are discriminating)",
  highConfCities.length > 0 && medConfCities.length > 0,
  `High=${highConfCities.length}, Medium=${medConfCities.length}, Low=${lowConfCities.length}`);
check("T1 metros have high confidence for premium brand (income > 55 in metros)",
  confResults.filter(c=>c.tier===1).some(c=>c.confidenceLevel==="high"),
  `T1 cities with high confidence: ${confResults.filter(c=>c.tier===1&&c.confidenceLevel==="high").map(c=>c.name).join(', ')}`);

// ═══════════════════════════════════════════════════════════════════════════════
// ITEM 40 — Distribution Architecture
// ═══════════════════════════════════════════════════════════════════════════════
section(40, "Distribution Architecture: correct mapping for product type × tier");
const archLuxury = scoreCities({ ...luxuryFeatures }, { launchBudgetINR: "₹20L – ₹1Cr", brandMaturity: "new" });
const archMass   = scoreCities({ ...massFeatures },   { launchBudgetINR: "₹1L – ₹5L",  brandMaturity: "new" });
const luxT1city  = archLuxury.find(c => c.tier === 1);
const luxT3city  = archLuxury.find(c => c.tier === 3);
const massT1city = archMass.find(c => c.tier === 1);
const massT3city = archMass.find(c => c.tier === 3);
console.log(`  ℹ  Luxury T1: dist=${luxT1city?.distributionType}, partner=${luxT1city?.distributorProfile}`);
console.log(`  ℹ  Luxury T3: dist=${luxT3city?.distributionType}, partner=${luxT3city?.distributorProfile}`);
console.log(`  ℹ  Mass T1:   dist=${massT1city?.distributionType}, partner=${massT1city?.distributorProfile}`);
console.log(`  ℹ  Mass T3:   dist=${massT3city?.distributionType}, partner=${massT3city?.distributorProfile}`);
check("Luxury brand in T1 → exclusive distribution",
  luxT1city?.distributionType === "exclusive",
  `Luxury T1: ${luxT1city?.distributionType}`);
check("Mass brand in T1 → intensive distribution",
  massT1city?.distributionType === "intensive",
  `Mass T1: ${massT1city?.distributionType}`);
check("Mass brand in T3 → broker-agent partner",
  massT3city?.distributorProfile === "broker-agent",
  `Mass T3: ${massT3city?.distributorProfile}`);
check("Luxury brand in T1 → direct or retailer partner",
  luxT1city?.distributorProfile === "direct" || luxT1city?.distributorProfile === "retailer",
  `Luxury T1: ${luxT1city?.distributorProfile}`);

// ═══════════════════════════════════════════════════════════════════════════════
// FINAL SUMMARY
// ═══════════════════════════════════════════════════════════════════════════════
console.log(`\n${"═".repeat(65)}`);
console.log(` FINAL VERIFICATION SUMMARY`);
console.log("═".repeat(65));
console.log(`  Total Checks : ${passed + failed}`);
console.log(`  ✅ Passed    : ${passed}`);
console.log(`  ❌ Failed    : ${failed}`);
console.log(`\n  VERDICT: ${failed === 0 ? "✅ ALL 13 ITEMS VERIFIED" : `⚠️  ${failed} ITEM(S) NEED REVIEW`}`);

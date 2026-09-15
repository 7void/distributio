/**
 * UNBIASED BACKTEST — calls the actual Gemini extraction API to get weights
 * exactly as the real pipeline does. No hand-crafted weights.
 * Run: npx tsx scripts/validate_unbiased.ts
 */
import { GoogleGenerativeAI } from "@google/generative-ai";
import * as dotenv from "dotenv";
import * as path from "path";
import { scoreCities } from "../lib/score";
import type { ExtractedFeatures, ProductProfile } from "../lib/types";
import citiesRaw from "../data/cities.json";
import datasetRaw from "../data/real_companies_dataset.json";

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

const cities = citiesRaw as any[];
const dataset = datasetRaw as any[];

// ── Same system prompt as /api/extract ───────────────────────────────────────
const systemPrompt = `You are a distribution intelligence engine for Indian consumer markets.
You receive a structured product profile and must return calibrated scoring parameters.
Return ONLY valid JSON - no explanation, no markdown, no code fences.

OUTPUT SCHEMA (return exactly this):
{ "productName": string, "category": string, "priceINR": number,
  "priceSegment": "mass"|"mid"|"premium"|"luxury",
  "incomeWeight": number, "retailWeight": number, "internetWeight": number,
  "coldWeight": number, "logisticsWeight": number, "affordability": number,
  "targetAudience": string, "needsColdChain": boolean,
  "distributionLevel": 0|1|2|3, "distributionType": "intensive"|"selective"|"exclusive",
  "distributorProfile": "direct"|"retailer"|"wholesaler"|"broker-agent",
  "channels": string[], "keyInsight": string, "seasonality": string }

WEIGHT RULES: all five weights must sum exactly to 1.0.
incomeWeight HIGH(0.30-0.40) for luxury/premium, LOW(0.05-0.14) for mass.
retailWeight HIGH(0.25-0.35) for physical-shelf items, LOW(0.05-0.14) for D2C-only.
internetWeight HIGH(0.25-0.35) for e-commerce/quick-commerce, LOW(0.05-0.14) for offline.
coldWeight 0.20-0.30 if perishable, 0 if not.
logisticsWeight HIGH(0.20-0.30) for bulky/heavy low-margin, LOW(0.05-0.09) for light high-value.
affordability: mass=1.10, mid=1.00, premium=0.85, luxury=0.55`;

// ── Metrics ───────────────────────────────────────────────────────────────────
function precisionAtK(actual: string[], predicted: string[], k = 6): number {
  const actualSet = new Set(actual.slice(0, k));
  return predicted.slice(0, k).filter(c => actualSet.has(c)).length / k;
}

function spearmanIntersection(actual: string[], predicted: string[]): number {
  const shared = actual.filter(c => predicted.includes(c));
  if (shared.length < 2) return 0;
  const n = shared.length;
  let sumD2 = 0;
  for (const city of shared) {
    const di = actual.indexOf(city) - predicted.indexOf(city);
    sumD2 += di * di;
  }
  return 1 - (6 * sumD2) / (n * (n * n - 1));
}

function checkAvoid(scored: any[], avoidList: string[]): { correct: number; total: number } {
  let correct = 0;
  for (const name of avoidList) {
    const city = scored.find((c: any) => c.name === name);
    if (city && (city.band === "AVOID" || city.band === "WEAK")) correct++;
  }
  return { correct, total: avoidList.length };
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) { console.error("Missing GEMINI_API_KEY in .env.local"); process.exit(1); }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
    systemInstruction: systemPrompt,
    generationConfig: { temperature: 0.1, responseMimeType: "application/json" }
  });

  type Result = { brand: string; p6: number; rho: number; avoidAcc: string; pass: boolean; features: any };
  const results: Result[] = [];

  console.log("=".repeat(80));
  console.log("  DISTRIBUTIO — UNBIASED BACKTEST (CaratLane, Tzinga, Sleepwell)");
  console.log("=".repeat(80) + "\n"); // --- FINAL 3 BRANDS ---
  const datasetToRun = dataset.slice(50, 58);
  for (const entry of datasetToRun) {
    // Build prompt exactly as the real app does
    const prompt = `PRODUCT PROFILE TO ANALYSE:

Product:      ${entry.brand} (${entry.product})
Price:        Rs${entry.priceINR} per unit
Margin:       ${entry.marginPercent}%
Cold chain:   ${entry.needsColdChain ? "Required" : "Not required"}
Brand:        ${entry.brand} (${entry.brandMaturity} brand)
Launch budget: ${entry.launchBudgetINR}
Warehouse:    ${entry.warehouseCity}
Delivery Radius: ${entry.deliveryRadiusKM} km
Income target:   ${entry.incomeTarget}
Preferred channels: ${entry.channels.join(", ")}
Distributor status: ${entry.hasDistributor}
Primary goal:   ${entry.primaryGoal}`;

    console.log(`Extracting features for: ${entry.brand} ...`);
    let features: ExtractedFeatures;
    try {
      const res = await model.generateContent(prompt);
      const text = res.response.text().trim();
      const start = text.indexOf("{"); const end = text.lastIndexOf("}");
      features = JSON.parse(text.slice(start, end + 1)) as ExtractedFeatures;
    } catch (e) {
      console.error(`  Gemini failed for ${entry.brand}:`, e);
      continue;
    }

    console.log(`  Gemini weights → income:${features.incomeWeight} retail:${features.retailWeight} internet:${features.internetWeight} cold:${features.coldWeight} logistics:${features.logisticsWeight} (sum=${(features.incomeWeight+features.retailWeight+features.internetWeight+features.coldWeight+features.logisticsWeight).toFixed(2)})`);

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

    const p6    = precisionAtK(entry.actualTop6, predictedTop6, 6);
    const rho   = spearmanIntersection(entry.actualTop6, predictedTop6);
    const avoid = checkAvoid(scored, entry.actualAvoid);
    const pass  = p6 >= 0.5 && avoid.correct >= Math.ceil(avoid.total * 0.6);

    results.push({ brand: entry.brand, p6: Math.round(p6 * 100), rho: Math.round(rho * 100) / 100, avoidAcc: `${avoid.correct}/${avoid.total}`, pass, features });

    console.log(`  Actual:    ${entry.actualTop6.join(", ")}`);
    console.log(`  Predicted: ${predictedTop6.join(", ")}`);
    console.log(`  P@6: ${Math.round(p6*100)}%  Rho: ${rho.toFixed(2)}  Avoid: ${avoid.correct}/${avoid.total}  ${pass ? "PASS" : "FAIL"}`);
    console.log("-".repeat(80));
  }

  const passed = results.filter(r => r.pass).length;
  const avgP6  = results.reduce((s, r) => s + r.p6, 0) / results.length;
  const avgRho = results.filter(r => isFinite(r.rho)).reduce((s, r) => s + r.rho, 0) / results.filter(r => isFinite(r.rho)).length;

  console.log("\n" + "=".repeat(80));
  console.log(`  FINAL RESULT: ${passed}/${results.length} PASSED`);
  console.log(`  Mean Precision@6 = ${avgP6.toFixed(1)}%   |   Mean Spearman rho = ${avgRho.toFixed(2)}`);
  console.log(`  Avoid-city accuracy = ${results.reduce((s,r) => s + parseInt(r.avoidAcc), 0)} / ${results.length * 5} (100% expected)`);
  console.log("=".repeat(80));
  results.forEach(r => {
    console.log(`  ${r.pass ? "PASS" : "FAIL"} | P@6=${r.p6}% | rho=${r.rho.toFixed(2)} | Avoid=${r.avoidAcc} | ${r.brand}`);
  });
}

main().catch(console.error);

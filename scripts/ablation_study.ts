/**
 * ABLATION STUDY — Parameter Sweep for All 8 Strategic Adjustments
 * Run: npx tsx scripts/ablation_study.ts
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";
import type { ExtractedFeatures } from "../lib/types";
import cities from "../data/cities.json";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

interface DatasetEntry {
  id: string; brand: string; product: string;
  priceINR: number; marginPercent: number; priceSegment: string;
  incomeTarget: string; warehouseCity: string; deliveryRadiusKM: number;
  needsColdChain: boolean; hasDistributor: string; channels: string[];
  brandMaturity: string; primaryGoal: string; launchBudgetINR: string;
  actualTop6: string[]; actualAvoid: string[];
}

function getDistanceKM(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

type Params = {
  tier1Bonus: number; tier3Penalty: number; densityMax: number;
  newBrandPenalty: number; noDistributorPenalty: number;
  d2cBonus: number; exclusiveT2Penalty: number; exclusiveT3Penalty: number;
};

function scoreCity(city: any, warehouse: any, features: ExtractedFeatures, entry: DatasetEntry, p: Params): number {
  const raw = { income: features.incomeWeight??0.25, retail: features.retailWeight??0.25, internet: features.internetWeight??0.25, cold: entry.needsColdChain?(features.coldWeight??0):0, logistics: features.logisticsWeight??0.25 };
  const sum = Object.values(raw).reduce((a, b) => a + b, 0);
  const w = sum > 0 ? Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, v/sum])) as typeof raw : raw;

  const base = city.income*w.income + city.retail*w.retail + city.internet*w.internet + city.cold*w.cold + city.logisticsScore*w.logistics;
  let adj = 0;

  if (city.tier === 1) adj += p.tier1Bonus;
  if (city.tier === 3 && entry.priceSegment !== "mass") adj -= p.tier3Penalty;
  adj += Math.min((city.population??0)*0.12, p.densityMax);
  if (entry.brandMaturity === "new" && city.tier === 1) adj -= p.newBrandPenalty;
  if (entry.brandMaturity === "established" && city.tier === 1) adj += 2;
  if (entry.hasDistributor === "no" && city.tier >= 2) adj -= p.noDistributorPenalty;
  if (entry.hasDistributor === "direct") {
    if (city.tier === 1) adj += p.d2cBonus;
    if (city.tier === 3) adj -= 4;
  }
  if (entry.priceSegment === "luxury") {
    if (city.tier === 3) adj -= p.exclusiveT3Penalty;
    else if (city.tier === 2) adj -= p.exclusiveT2Penalty;
  }

  const distance = warehouse ? getDistanceKM(warehouse.lat, warehouse.lng, city.lat, city.lng) : 0;
  let freight = Math.min(15, entry.priceINR*0.10) + (distance/100)*3.0;
  if (entry.needsColdChain) freight *= 1.35;
  freight -= (city.logisticsScore/100)*4;
  const vd: Record<string,number> = { mass:0.25, mid:0.45, premium:0.80, luxury:1.00 };
  freight = Math.max(2, Math.min(freight*(vd[entry.priceSegment]??0.5), 95));

  const unitMargin = entry.priceINR*(entry.marginPercent/100);
  const marginRatio = unitMargin > 0 ? Math.max(0, unitMargin-freight)/unitMargin : 0;
  let score = (base + adj) * (0.30 + marginRatio*0.70);

  if (entry.deliveryRadiusKM && distance > entry.deliveryRadiusKM) score -= Math.min(35, Math.round((distance-entry.deliveryRadiusKM)/40));
  if (score > 90) score = 90 + 10*(1-Math.exp(-(score-90)/10));
  return Math.max(0, Math.round(score));
}

function evaluate(dataset: DatasetEntry[], featureMap: Map<string, ExtractedFeatures>, p: Params) {
  let passes=0, totalP6=0, avoidHits=0, avoidTotal=0, n=0;
  for (const entry of dataset) {
    const features = featureMap.get(entry.id); if (!features) continue; n++;
    const warehouse = (cities as any[]).find((c:any) => c.name.toLowerCase()===entry.warehouseCity.toLowerCase());
    const scored = (cities as any[]).map((c:any) => ({ name: c.name, score: scoreCity(c, warehouse, features, entry, p) })).sort((a,b)=>b.score-a.score);
    const top6 = scored.slice(0,6).map(s=>s.name);
    const bottom10 = scored.slice(-10).map(s=>s.name);
    const p6 = entry.actualTop6.filter(c=>top6.includes(c)).length/6;
    totalP6+=p6; if(p6>=0.5) passes++;
    avoidHits+=entry.actualAvoid.filter(c=>bottom10.includes(c)).length;
    avoidTotal+=entry.actualAvoid.length;
  }
  return { passRate: n>0?(passes/n)*100:0, meanP6: n>0?(totalP6/n)*100:0, avoidAcc: avoidTotal>0?(avoidHits/avoidTotal)*100:0, n };
}

async function main() {
  const dataset: DatasetEntry[] = JSON.parse(fs.readFileSync(path.join(process.cwd(),"data","real_companies_dataset.json"),"utf8"));
  const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_GENERATIVE_AI_API_KEY ?? "";
  const model = new GoogleGenerativeAI(apiKey).getGenerativeModel({ model: "gemini-2.0-flash-lite" });

  console.log("Extracting Gemini features for all brands (4s delay between calls)...\n");
  const featureMap = new Map<string, ExtractedFeatures>();
  for (const entry of dataset) {
    const prompt = `FMCG analyst. Output ONLY valid JSON: {"incomeWeight":0.0-1.0,"retailWeight":0.0-1.0,"internetWeight":0.0-1.0,"coldWeight":0.0-1.0,"logisticsWeight":0.0-1.0,"priceINR":${entry.priceINR},"priceSegment":"${entry.priceSegment}","needsColdChain":${entry.needsColdChain},"channels":${JSON.stringify(entry.channels)},"category":"fmcg","affordability":1.0,"distributionType":"selective","distributionLevel":1,"seasonality":"none"}
Weights must sum to 1.0. Product: ${entry.product} by ${entry.brand}. Price Rs${entry.priceINR}. Margin ${entry.marginPercent}%.`;
    try {
      const res = await model.generateContent(prompt);
      const text = res.response.text().trim();
      const start=text.indexOf("{"); const end=text.lastIndexOf("}");
      featureMap.set(entry.id, JSON.parse(text.slice(start, end+1)) as ExtractedFeatures);
      process.stdout.write("✓");
    } catch { process.stdout.write("✗"); }
    await new Promise(r => setTimeout(r, 4200));
  }
  console.log(`\n\nExtracted: ${featureMap.size}/${dataset.length} brands\n`);

  const baseline: Params = { tier1Bonus:4, tier3Penalty:5, densityMax:4, newBrandPenalty:4, noDistributorPenalty:6, d2cBonus:3, exclusiveT2Penalty:10, exclusiveT3Penalty:20 };
  const baseResult = evaluate(dataset, featureMap, baseline);

  console.log("=".repeat(72));
  console.log("  DISTRIBUTIO — ABLATION STUDY: Parameter Sweep on All 8 Penalties");
  console.log("=".repeat(72));
  console.log(`  BASELINE → Pass: ${baseResult.passRate.toFixed(1)}% | Mean P@6: ${baseResult.meanP6.toFixed(1)}% | Avoid: ${baseResult.avoidAcc.toFixed(1)}% | n=${baseResult.n}`);
  console.log("=".repeat(72)+"\n");

  function sweep(name: string, key: keyof Params, values: number[]) {
    console.log(`▶ ${name}  [Current: ${baseline[key]}]`);
    console.log(`  ${"Value".padEnd(8)} ${"Pass%".padEnd(9)} ${"MeanP6%".padEnd(10)} ${"Avoid%".padEnd(10)}`);
    console.log("  "+"-".repeat(40));
    let bestP6=0, bestVal=baseline[key];
    for (const v of values) {
      const r = evaluate(dataset, featureMap, { ...baseline, [key]: v });
      const isCurrent = v===baseline[key]; const isBest = r.meanP6>bestP6;
      if(isBest){ bestP6=r.meanP6; bestVal=v; }
      const tag = isCurrent ? " ◄ CURRENT" : (r.meanP6===bestP6 ? " ★ BEST" : "");
      console.log(`  ${String(v).padEnd(8)} ${(r.passRate.toFixed(1)+"%").padEnd(9)} ${(r.meanP6.toFixed(1)+"%").padEnd(10)} ${(r.avoidAcc.toFixed(1)+"%").padEnd(10)}${tag}`);
    }
    const verdict = bestVal===baseline[key] ? "✅ CURRENT VALUE IS OPTIMAL" : `⚠️  OPTIMAL=${bestVal} (current=${baseline[key]})`;
    console.log(`  ${verdict}\n`);
  }

  sweep("1. Tier-1 Strategic Bonus (+pts)",         "tier1Bonus",          [0,2,4,6,8,10]);
  sweep("2. Tier-3 Non-Mass Penalty (-pts)",         "tier3Penalty",        [0,2,5,8,10,15]);
  sweep("3. Population Density Bonus (max +pts)",    "densityMax",          [0,2,4,6,8]);
  sweep("4. New Brand Metro Penalty (-pts)",         "newBrandPenalty",     [0,2,4,6,8]);
  sweep("5. No Distributor Penalty (-pts)",          "noDistributorPenalty",[0,3,6,9,12]);
  sweep("6. D2C Metro Bonus (+pts)",                 "d2cBonus",            [0,1,3,5,7]);
  sweep("7. Exclusive Distrib T2 Penalty (-pts)",    "exclusiveT2Penalty",  [0,5,10,15,20]);
  sweep("8. Exclusive Distrib T3 Penalty (-pts)",    "exclusiveT3Penalty",  [0,10,15,20,25,30]);

  console.log("=".repeat(72));
  console.log("  ABLATION COMPLETE");
  console.log("=".repeat(72));
}

main().catch(console.error);

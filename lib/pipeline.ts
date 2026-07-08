// To run: POST /api/pipeline/run
// with header x-pipeline-secret: [your secret]
// Recommended: run weekly via cron or manually before demos

import fs from "fs";
import path from "path";
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { City } from "./types";
import { enrichCity, applyEnrichment } from "./enrich";

function logPipeline(msg: string) {
  const time = new Date().toTimeString().split(" ")[0]; // HH:MM:SS
  console.log(`[PIPELINE ${time}] ${msg}`);
}

function parseCityIds(text: string, validIds: string[]): string[] {
  try {
    const trimmed = text.trim();
    const start = trimmed.indexOf("[");
    const end = trimmed.lastIndexOf("]");
    if (start === -1 || end === -1 || end <= start) {
      return [];
    }
    const arr = JSON.parse(trimmed.slice(start, end + 1));
    if (Array.isArray(arr)) {
      return arr
        .map((item) => String(item).trim().toLowerCase())
        .filter((id) => validIds.includes(id));
    }
  } catch (e) {
    console.error("[PIPELINE] Error parsing matched city IDs:", e);
  }
  return [];
}

export async function runEnrichmentPipeline(): Promise<void> {
  logPipeline("Starting market signals pipeline run...");

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "your_key_here") {
    throw new Error("Missing GEMINI_API_KEY in .env.local.");
  }

  const genAI = new GoogleGenerativeAI(apiKey);

  // 1. FETCH SIGNALS
  const queries = [
    "India retail expansion DMart Reliance 2024 new cities",
    "India cold chain infrastructure investment 2024",
    "India quick commerce Blinkit Zepto Swiggy expansion tier 2 cities 2024",
    "India FMCG distribution new markets 2024",
    "India logistics warehouse investment cities 2024",
    "India per capita income growth cities 2024",
    "India ecommerce penetration tier 2 tier 3 cities 2024",
    "India premium brands launch new cities 2024"
  ];

  const signals: string[] = [];
  const searchModel = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
    tools: [{ googleSearchRetrieval: {} }]
  });

  for (const query of queries) {
    try {
      logPipeline(`Running search query: "${query}"`);
      const prompt = `Search for recent news and write a detailed summary about: ${query}`;
      const result = await searchModel.generateContent(prompt);
      const text = result.response.text();
      if (text && text.trim().length > 0) {
        signals.push(text);
        logPipeline(`Successfully fetched signal for query: "${query}"`);
      } else {
        logPipeline(`Empty signal returned for query: "${query}"`);
      }
    } catch (error) {
      logPipeline(`Error fetching signal for query "${query}": ${error instanceof Error ? error.message : error}`);
    }
  }

  logPipeline(`Fetched ${signals.length} signals in total.`);

  // Load current cities dataset
  const citiesPath = path.join(process.cwd(), "data", "cities.json");
  let cities: City[] = [];
  try {
    const rawData = fs.readFileSync(citiesPath, "utf8");
    cities = JSON.parse(rawData);
  } catch (error) {
    throw new Error(`Failed to read or parse cities.json: ${error instanceof Error ? error.message : error}`);
  }

  const validIds = cities.map((c) => c.id.toLowerCase());
  const cityNamesList = cities.map((c) => c.name).join(", ");
  const cityIdsList = cities.map((c) => c.id).join(", ");

  const matcherModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  // 2. MATCH SIGNALS TO CITIES AND ENRICH
  for (let i = 0; i < signals.length; i++) {
    const signal = signals[i];
    logPipeline(`Processing signal ${i + 1}/${signals.length}...`);

    let matchedIds: string[] = [];
    try {
      const matchPrompt = `Given this news signal, which of these Indian cities are directly mentioned or clearly affected?
Cities: ${cityNamesList}
Signal: ${signal}
Return ONLY a JSON array of city ids from this list: [${cityIdsList}]
Return empty array if none are relevant.`;

      const matchResult = await matcherModel.generateContent(matchPrompt);
      const matchText = matchResult.response.text();
      matchedIds = parseCityIds(matchText, validIds);
      logPipeline(`Signal ${i + 1} matched cities: [${matchedIds.join(", ")}]`);
    } catch (error) {
      logPipeline(`Error matching signal ${i + 1} to cities: ${error instanceof Error ? error.message : error}`);
      continue;
    }

    // 3. ENRICH MATCHED CITIES
    for (const cityId of matchedIds) {
      const cityIndex = cities.findIndex((c) => c.id.toLowerCase() === cityId);
      if (cityIndex === -1) continue;

      const targetCity = cities[cityIndex];
      logPipeline(`Enriching city: ${targetCity.name} (${targetCity.id})`);

      try {
        const enrichment = await enrichCity(targetCity, signal);
        cities[cityIndex] = applyEnrichment(targetCity, enrichment);
        logPipeline(`Successfully enriched and updated ${targetCity.name}.`);
      } catch (error) {
        logPipeline(`Failed to enrich city ${targetCity.name}: ${error instanceof Error ? error.message : error}`);
      }
    }
  }

  // 4. WRITE UPDATED DATASET
  try {
    logPipeline("Writing updated dataset to cities.json...");
    fs.writeFileSync(citiesPath, JSON.stringify(cities, null, 2), "utf8");
    logPipeline("Pipeline run completed successfully!");
  } catch (error) {
    throw new Error(`Failed to write updated cities to cities.json: ${error instanceof Error ? error.message : error}`);
  }
}

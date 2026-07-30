import fs from "fs";
import path from "path";
import { GoogleGenerativeAI } from "@google/generative-ai";

// 1. Read API Key and DATABASE_URL from .env.local
const envPath = path.join(__dirname, "..", ".env.local");
let apiKey = "";
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf8");
  const matchKey = envContent.match(/GEMINI_API_KEY\s*=\s*([^\r\n]+)/);
  if (matchKey) {
    apiKey = matchKey[1].trim();
  }
  const matchDb = envContent.match(/DATABASE_URL\s*=\s*([^\r\n]+)/);
  if (matchDb) {
    process.env.DATABASE_URL = matchDb[1].trim();
  }
}

if (!apiKey || apiKey === "your_key_here") {
  console.error("Error: Please set GEMINI_API_KEY in .env.local first.");
  process.exit(1);
}

// Import database queries
import { getCities, updateCity } from "../db/queries";
import { City } from "../lib/types";

// 2. Setup Gemini API request
async function callGeminiForBatch(batch: City[]) {
  const prompt = `You are a market research analyst specialized in Indian retail and logistics.
For the following batch of Indian cities, estimate four scores from 0 to 100 based on their real market infrastructure:

1. quickCommerceScore (0-100): Coverage and density of Quick Commerce dark stores (Blinkit, Zepto, Swiggy Instamart).
   - Metros/Tier 1 (Mumbai, Bangalore, Delhi, etc.) should be very high (80-98).
   - Prominent Tier 2 (Lucknow, Jaipur, Kochi) should be moderate (40-75).
   - Smaller Tier 2 / Tier 3 cities should be low to zero (0-39).
2. logisticsScore (0-100): Presence of 3PL warehousing hubs, road/rail cargo connectivity, and local last-mile courier networks.
3. modernTradeScore (0-100): Presence and penetration of organized retail outlets (DMart, Reliance Fresh, Star Bazaar, Spencer's).
4. kiranaScore (0-100): Density and dominance of traditional independent Mom-and-Pop grocery shops (Kiranas). Usually inversely correlated to modern trade/quick commerce, being very high in Tier 2 and Tier 3 cities (80-98).

CITIES BATCH:
${JSON.stringify(batch.map(c => ({ id: c.id, name: c.name, state: c.state, tier: c.tier, population: c.population })), null, 2)}

Return ONLY a valid JSON array of objects. Do not wrap it in markdown code blocks. Each object in the array must match this schema:
{
  "id": string,
  "quickCommerceScore": number,
  "logisticsScore": number,
  "modernTradeScore": number,
  "kiranaScore": number
}`;

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: {
      responseMimeType: "application/json"
    }
  });

  const result = await model.generateContent(prompt);
  const textResponse = result.response.text();
  
  try {
    return JSON.parse(textResponse.trim());
  } catch (e) {
    console.log("Failed to parse response, trying to extract JSON block:", textResponse);
    const start = textResponse.indexOf("[");
    const end = textResponse.lastIndexOf("]");
    if (start !== -1 && end !== -1) {
      return JSON.parse(textResponse.slice(start, end + 1));
    }
    throw e;
  }
}

async function enrichAll() {
  const cities = await getCities();
  console.log(`Loaded ${cities.length} cities from the database.`);

  const batchSize = 10;

  for (let i = 0; i < cities.length; i += batchSize) {
    const batch = cities.slice(i, i + batchSize);
    console.log(`Processing batch ${i / batchSize + 1} of ${Math.ceil(cities.length / batchSize)} (Cities: ${batch.map(c => c.name).join(", ")})...`);
    
    let retries = 3;
    let success = false;
    
    while (retries > 0 && !success) {
      try {
        const scores = await callGeminiForBatch(batch);
        
        // Map scores back to cities and save to DB
        for (const city of batch) {
          const scoreObj = scores.find((s: any) => s.id === city.id) || {
            quickCommerceScore: city.tier === 1 ? 85 : city.tier === 2 ? 45 : 10,
            logisticsScore: city.tier === 1 ? 80 : city.tier === 2 ? 60 : 35,
            modernTradeScore: city.tier === 1 ? 80 : city.tier === 2 ? 55 : 20,
            kiranaScore: city.tier === 1 ? 65 : city.tier === 2 ? 85 : 95
          };
          
          const updatedCity: Partial<City> = {
            quickCommerceScore: scoreObj.quickCommerceScore ?? (city.tier === 1 ? 85 : city.tier === 2 ? 45 : 10),
            logisticsScore: scoreObj.logisticsScore ?? (city.tier === 1 ? 80 : city.tier === 2 ? 60 : 35),
            modernTradeScore: scoreObj.modernTradeScore ?? (city.tier === 1 ? 80 : city.tier === 2 ? 55 : 20),
            kiranaScore: scoreObj.kiranaScore ?? (city.tier === 1 ? 65 : city.tier === 2 ? 85 : 95)
          };

          await updateCity(city.id, updatedCity);
        }
        
        success = true;
        console.log(`✓ Batch ${i / batchSize + 1} complete.`);
      } catch (err: any) {
        console.error(`✗ Error processing batch, retries left: ${retries - 1}. Error: ${err.message}`);
        retries--;
        if (retries > 0) {
          await new Promise(r => setTimeout(r, 3000));
        }
      }
    }

    if (!success) {
      console.error("Critical error: Failed to fetch scores for batch. Exiting to avoid partial write.");
      process.exit(1);
    }
    
    // Rate limit delay between batches to avoid 429
    await new Promise(r => setTimeout(r, 1500));
  }

  console.log("SUCCESS: Enriched cities saved directly to the database.");
  process.exit(0);
}

enrichAll().catch((err) => {
  console.error("Unhandled error during enrichment:", err);
  process.exit(1);
});

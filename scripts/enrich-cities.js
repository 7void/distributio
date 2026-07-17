const fs = require('fs');
const path = require('path');

// 1. Read API Key from .env.local
const envPath = path.join(__dirname, '..', '.env.local');
let apiKey = '';
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const match = envContent.match(/GEMINI_API_KEY\s*=\s*([^\s]+)/);
  if (match) {
    apiKey = match[1];
  }
}

if (!apiKey || apiKey === 'your_key_here') {
  console.error("Error: Please set GEMINI_API_KEY in .env.local first.");
  process.exit(1);
}

// 2. Read cities.json
const citiesPath = path.join(__dirname, '..', 'data', 'cities.json');
if (!fs.existsSync(citiesPath)) {
  console.error("Error: cities.json not found at: " + citiesPath);
  process.exit(1);
}

const cities = JSON.parse(fs.readFileSync(citiesPath, 'utf8'));
console.log(`Loaded ${cities.length} cities from cities.json.`);

// 3. Setup Gemini API request
async function callGeminiForBatch(batch) {
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

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json"
      }
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`API call failed: ${response.statusText} - ${errText}`);
  }

  const result = await response.json();
  const textResponse = result.candidates[0].content.parts[0].text;
  
  try {
    return JSON.parse(textResponse.trim());
  } catch (e) {
    console.log("Failed to parse response, trying to extract JSON block:", textResponse);
    const start = textResponse.indexOf('[');
    const end = textResponse.lastIndexOf(']');
    if (start !== -1 && end !== -1) {
      return JSON.parse(textResponse.slice(start, end + 1));
    }
    throw e;
  }
}

async function enrichAll() {
  const batchSize = 10;
  const enrichedCities = [];

  for (let i = 0; i < cities.length; i += batchSize) {
    const batch = cities.slice(i, i + batchSize);
    console.log(`Processing batch ${i / batchSize + 1} of ${Math.ceil(cities.length / batchSize)} (Cities: ${batch.map(c => c.name).join(', ')})...`);
    
    let retries = 3;
    let success = false;
    
    while (retries > 0 && !success) {
      try {
        const scores = await callGeminiForBatch(batch);
        
        // Map scores back to cities
        for (const city of batch) {
          const scoreObj = scores.find(s => s.id === city.id) || {
            quickCommerceScore: city.tier === 1 ? 85 : city.tier === 2 ? 45 : 10,
            logisticsScore: city.tier === 1 ? 80 : city.tier === 2 ? 60 : 35,
            modernTradeScore: city.tier === 1 ? 80 : city.tier === 2 ? 55 : 20,
            kiranaScore: city.tier === 1 ? 65 : city.tier === 2 ? 85 : 95
          };
          
          enrichedCities.push({
            ...city,
            quickCommerceScore: scoreObj.quickCommerceScore ?? (city.tier === 1 ? 85 : city.tier === 2 ? 45 : 10),
            logisticsScore: scoreObj.logisticsScore ?? (city.tier === 1 ? 80 : city.tier === 2 ? 60 : 35),
            modernTradeScore: scoreObj.modernTradeScore ?? (city.tier === 1 ? 80 : city.tier === 2 ? 55 : 20),
            kiranaScore: scoreObj.kiranaScore ?? (city.tier === 1 ? 65 : city.tier === 2 ? 85 : 95)
          });
        }
        
        success = true;
        console.log(`✓ Batch ${i / batchSize + 1} complete.`);
      } catch (err) {
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

  // Save enriched cities back to file
  fs.writeFileSync(citiesPath, JSON.stringify(enrichedCities, null, 2), 'utf8');
  console.log("SUCCESS: Enriched cities saved back to data/cities.json");
}

enrichAll();

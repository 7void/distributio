import fs from "fs";
import path from "path";

// 1. Manually parse .env.local to get DATABASE_URL before importing the DB client
const envPath = path.join(__dirname, "..", ".env.local");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf8");
  const match = envContent.match(/DATABASE_URL\s*=\s*([^\r\n]+)/);
  if (match) {
    process.env.DATABASE_URL = match[1].trim();
  }
}

async function main() {
  const citiesJsonPath = path.join(__dirname, "..", "data", "cities.json");
  if (!fs.existsSync(citiesJsonPath)) {
    console.error(`Error: cities.json not found at ${citiesJsonPath}`);
    process.exit(1);
  }

  const rawData = fs.readFileSync(citiesJsonPath, "utf8");
  const jsonCities = JSON.parse(rawData);

  console.log(`Loaded ${jsonCities.length} cities from cities.json.`);

  // Dynamically import client and schema to avoid hoisted import resolution issues
  const { db } = await import("./client");
  const { cities } = await import("./schema");

  let successCount = 0;

  for (const city of jsonCities) {
    console.log(`Seeding/Updating city: ${city.name} (${city.id})...`);

    const mappedCity = {
      id: city.id,
      name: city.name,
      state: city.state,
      tier: city.tier,
      population: city.population,
      lat: city.lat,
      lng: city.lng,
      income: city.income,
      retail: city.retail,
      internet: city.internet,
      cold: city.cold,
      primaryRetailFormat: city.primaryRetailFormat,
      topDistributionChallenges: city.topDistributionChallenges,
      strongCategories: city.strongCategories,
      competitorPresence: city.competitorPresence || {},
      recentDevelopments: city.recentDevelopments || [],
      retailScoreAdjustment: city.retailScoreAdjustment ?? 0,
      coldScoreAdjustment: city.coldScoreAdjustment ?? 0,
      incomeScoreAdjustment: city.incomeScoreAdjustment ?? 0,
      internetScoreAdjustment: city.internetScoreAdjustment ?? 0,
      competitorSaturation: city.competitorSaturation || {},
      lastEnriched: city.lastEnriched ? new Date(city.lastEnriched) : null,
      quickCommerceScore: city.quickCommerceScore,
      logisticsScore: city.logisticsScore,
      modernTradeScore: city.modernTradeScore,
      kiranaScore: city.kiranaScore,
    };

    try {
      await db.insert(cities)
        .values(mappedCity)
        .onConflictDoUpdate({
          target: cities.id,
          set: mappedCity
        });
      successCount++;
    } catch (err) {
      console.error(`Failed to seed city ${city.name}:`, err);
    }
  }

  console.log(`\n--- Seeding completed! ---`);
  console.log(`Successfully processed ${successCount} out of ${jsonCities.length} cities.`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Unhandled error during seeding:", err);
  process.exit(1);
});

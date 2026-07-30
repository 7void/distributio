import { db } from "./client";
import { cities, analyses, type DbCity, type DbInsertCity } from "./schema";
import { eq, sql } from "drizzle-orm";
import type { City, ExtractedFeatures } from "@/lib/types";
import { getOrSet } from "@/lib/cache";

export function mapDbCityToCity(dbCity: DbCity): City {
  return {
    id: dbCity.id,
    name: dbCity.name,
    state: dbCity.state,
    tier: dbCity.tier as any,
    population: dbCity.population,
    lat: dbCity.lat,
    lng: dbCity.lng,
    income: dbCity.income,
    retail: dbCity.retail,
    internet: dbCity.internet,
    cold: dbCity.cold,
    primaryRetailFormat: dbCity.primaryRetailFormat,
    topDistributionChallenges: dbCity.topDistributionChallenges,
    strongCategories: dbCity.strongCategories,
    competitorPresence: dbCity.competitorPresence || undefined,
    recentDevelopments: dbCity.recentDevelopments || undefined,
    retailScoreAdjustment: dbCity.retailScoreAdjustment ?? undefined,
    coldScoreAdjustment: dbCity.coldScoreAdjustment ?? undefined,
    incomeScoreAdjustment: dbCity.incomeScoreAdjustment ?? undefined,
    internetScoreAdjustment: dbCity.internetScoreAdjustment ?? undefined,
    competitorSaturation: dbCity.competitorSaturation || undefined,
    lastEnriched: dbCity.lastEnriched ? dbCity.lastEnriched.toISOString() : undefined,
    quickCommerceScore: dbCity.quickCommerceScore,
    logisticsScore: dbCity.logisticsScore,
    modernTradeScore: dbCity.modernTradeScore,
    kiranaScore: dbCity.kiranaScore,
  };
}

export function mapCityUpdatesToDb(updates: Partial<City>): Partial<DbInsertCity> {
  const dbUpdates: Partial<DbInsertCity> = {};
  if (updates.id !== undefined) dbUpdates.id = updates.id;
  if (updates.name !== undefined) dbUpdates.name = updates.name;
  if (updates.state !== undefined) dbUpdates.state = updates.state;
  if (updates.tier !== undefined) dbUpdates.tier = updates.tier;
  if (updates.population !== undefined) dbUpdates.population = updates.population;
  if (updates.lat !== undefined) dbUpdates.lat = updates.lat;
  if (updates.lng !== undefined) dbUpdates.lng = updates.lng;
  if (updates.income !== undefined) dbUpdates.income = updates.income;
  if (updates.retail !== undefined) dbUpdates.retail = updates.retail;
  if (updates.internet !== undefined) dbUpdates.internet = updates.internet;
  if (updates.cold !== undefined) dbUpdates.cold = updates.cold;
  if (updates.primaryRetailFormat !== undefined) dbUpdates.primaryRetailFormat = updates.primaryRetailFormat;
  if (updates.topDistributionChallenges !== undefined) dbUpdates.topDistributionChallenges = updates.topDistributionChallenges;
  if (updates.strongCategories !== undefined) dbUpdates.strongCategories = updates.strongCategories;
  if (updates.competitorPresence !== undefined) dbUpdates.competitorPresence = updates.competitorPresence;
  if (updates.recentDevelopments !== undefined) dbUpdates.recentDevelopments = updates.recentDevelopments;
  if (updates.retailScoreAdjustment !== undefined) dbUpdates.retailScoreAdjustment = updates.retailScoreAdjustment;
  if (updates.coldScoreAdjustment !== undefined) dbUpdates.coldScoreAdjustment = updates.coldScoreAdjustment;
  if (updates.incomeScoreAdjustment !== undefined) dbUpdates.incomeScoreAdjustment = updates.incomeScoreAdjustment;
  if (updates.internetScoreAdjustment !== undefined) dbUpdates.internetScoreAdjustment = updates.internetScoreAdjustment;
  if (updates.competitorSaturation !== undefined) dbUpdates.competitorSaturation = updates.competitorSaturation;
  if (updates.lastEnriched !== undefined) {
    dbUpdates.lastEnriched = updates.lastEnriched ? new Date(updates.lastEnriched) : null;
  }
  if (updates.quickCommerceScore !== undefined) dbUpdates.quickCommerceScore = updates.quickCommerceScore;
  if (updates.logisticsScore !== undefined) dbUpdates.logisticsScore = updates.logisticsScore;
  if (updates.modernTradeScore !== undefined) dbUpdates.modernTradeScore = updates.modernTradeScore;
  if (updates.kiranaScore !== undefined) dbUpdates.kiranaScore = updates.kiranaScore;
  return dbUpdates;
}

export async function getCities(): Promise<City[]> {
  return getOrSet<City[]>("cities:all", 600, async () => {
    const rows = await db.select().from(cities);
    return rows.map(mapDbCityToCity);
  });
}

export async function getCityById(id: string): Promise<City | undefined> {
  const rows = await db.select().from(cities).where(eq(cities.id, id));
  if (rows.length === 0) return undefined;
  return mapDbCityToCity(rows[0]);
}

export async function updateCity(id: string, updates: Partial<City>): Promise<City> {
  const dbUpdates = mapCityUpdatesToDb(updates);
  const rows = await db.update(cities)
    .set(dbUpdates)
    .where(eq(cities.id, id))
    .returning();
  if (rows.length === 0) {
    throw new Error(`City with id ${id} not found.`);
  }
  return mapDbCityToCity(rows[0]);
}

export async function findSimilarAnalysis(
  embedding: number[],
  threshold: number = 0.90
): Promise<{ features: ExtractedFeatures; similarity: number } | null> {
  try {
    const vectorStr = `[${embedding.join(",")}]`;
    const result = await db.execute(sql`
      SELECT extracted_features, (1 - (embedding <=> ${vectorStr}::vector)) AS similarity
      FROM analyses
      WHERE embedding IS NOT NULL
        AND (1 - (embedding <=> ${vectorStr}::vector)) >= ${threshold}
      ORDER BY embedding <=> ${vectorStr}::vector ASC
      LIMIT 1
    `);

    if (result.rows && result.rows.length > 0) {
      const row = result.rows[0] as {
        extracted_features: ExtractedFeatures;
        similarity: number | string;
      };
      const similarityNum = Number(row.similarity);
      if (similarityNum >= threshold) {
        return {
          features: row.extracted_features,
          similarity: similarityNum,
        };
      }
    }
  } catch (error) {
    console.error("[PGVECTOR] Similarity search error:", error);
  }
  return null;
}

export async function createAnalysis(
  prompt: string,
  extractedFeatures: ExtractedFeatures,
  memo: string,
  modelVersion: string = "gemini-2.5-flash",
  embedding?: number[]
): Promise<void> {
  await db.insert(analyses).values({
    prompt,
    extractedFeatures,
    memo,
    modelVersion,
    embedding: embedding ?? null,
  });
}

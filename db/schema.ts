import { pgTable, text, integer, real, timestamp, jsonb, uuid, vector, index } from "drizzle-orm/pg-core";
import { type InferSelectModel, type InferInsertModel } from "drizzle-orm";

export const cities = pgTable("cities", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  state: text("state").notNull(),
  tier: integer("tier").notNull(),
  population: real("population").notNull(),
  lat: real("lat").notNull(),
  lng: real("lng").notNull(),
  income: integer("income").notNull(),
  retail: integer("retail").notNull(),
  internet: integer("internet").notNull(),
  cold: integer("cold").notNull(),
  primaryRetailFormat: text("primary_retail_format").notNull(),
  topDistributionChallenges: jsonb("top_distribution_challenges").$type<string[]>().notNull(),
  strongCategories: jsonb("strong_categories").$type<string[]>().notNull(),
  competitorPresence: jsonb("competitor_presence").$type<Record<string, string[]>>(),
  recentDevelopments: jsonb("recent_developments").$type<Array<{
    type: "retail_expansion" | "infrastructure" | "economic" | "competitor";
    description: string;
    impact: "income" | "retail" | "internet" | "cold" | "competitor";
    direction: "positive" | "negative";
    magnitude: number;
    date: string;
    source: string;
  }>>(),
  retailScoreAdjustment: integer("retail_score_adjustment").default(0),
  coldScoreAdjustment: integer("cold_score_adjustment").default(0),
  incomeScoreAdjustment: integer("income_score_adjustment").default(0),
  internetScoreAdjustment: integer("internet_score_adjustment").default(0),
  competitorSaturation: jsonb("competitor_saturation").$type<Record<string, "low" | "medium" | "high">>(),
  lastEnriched: timestamp("last_enriched"),
  quickCommerceScore: integer("quick_commerce_score").notNull(),
  logisticsScore: integer("logistics_score").notNull(),
  modernTradeScore: integer("modern_trade_score").notNull(),
  kiranaScore: integer("kirana_score").notNull(),
});

export const analyses = pgTable("analyses", {
  id: uuid("id").defaultRandom().primaryKey(),
  prompt: text("prompt").notNull(),
  extractedFeatures: jsonb("extracted_features").notNull(),
  memo: text("memo").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  modelVersion: text("model_version").default("gemini-2.5-flash").notNull(),
  embedding: vector("embedding", { dimensions: 768 }),
}, (table) => ({
  embeddingIdx: index("analyses_embedding_idx").using("hnsw", table.embedding.op("vector_cosine_ops")),
}));

export type DbCity = InferSelectModel<typeof cities>;
export type DbInsertCity = InferInsertModel<typeof cities>;

export type DbAnalysis = InferSelectModel<typeof analyses>;
export type DbInsertAnalysis = InferInsertModel<typeof analyses>;

CREATE TABLE "analyses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"prompt" text NOT NULL,
	"extracted_features" jsonb NOT NULL,
	"memo" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"model_version" text DEFAULT 'gemini-2.5-flash' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cities" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"state" text NOT NULL,
	"tier" integer NOT NULL,
	"population" real NOT NULL,
	"lat" real NOT NULL,
	"lng" real NOT NULL,
	"income" integer NOT NULL,
	"retail" integer NOT NULL,
	"internet" integer NOT NULL,
	"cold" integer NOT NULL,
	"primary_retail_format" text NOT NULL,
	"top_distribution_challenges" jsonb NOT NULL,
	"strong_categories" jsonb NOT NULL,
	"competitor_presence" jsonb,
	"recent_developments" jsonb,
	"retail_score_adjustment" integer DEFAULT 0,
	"cold_score_adjustment" integer DEFAULT 0,
	"income_score_adjustment" integer DEFAULT 0,
	"internet_score_adjustment" integer DEFAULT 0,
	"competitor_saturation" jsonb,
	"last_enriched" timestamp,
	"quick_commerce_score" integer NOT NULL,
	"logistics_score" integer NOT NULL,
	"modern_trade_score" integer NOT NULL,
	"kirana_score" integer NOT NULL
);

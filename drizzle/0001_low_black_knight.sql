CREATE EXTENSION IF NOT EXISTS vector;--> statement-breakpoint
ALTER TABLE "analyses" ADD COLUMN "embedding" vector(768);--> statement-breakpoint
CREATE INDEX "analyses_embedding_idx" ON "analyses" USING hnsw ("embedding" vector_cosine_ops);
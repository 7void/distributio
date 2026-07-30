# distribut.io — City Dataset Migration to Postgres

This project has migrated its city dataset from a static JSON file to a real PostgreSQL database using Drizzle ORM and node-postgres.

## Database Setup Instructions

To run this application locally with the Postgres database, follow these steps:

### 1. Create a Postgres Database
Set up a PostgreSQL database using any provider of your choice, such as:
- [Supabase](https://supabase.com)
- [Neon](https://neon.tech)
- A local PostgreSQL instance

### 2. Configure Environment Variables
Open your `.env.local` file and add the `DATABASE_URL` connection string:
```env
DATABASE_URL="postgresql://your_username:your_password@your_host:5432/your_db_name"
```

### 3. Generate the Schema Migrations
Generate the Drizzle migration SQL files from the schema definition:
```bash
npm run db:generate
```

### 4. Apply Database Migrations
Apply the generated SQL migrations to your PostgreSQL database:
```bash
npm run db:migrate
```

### 5. Seed the Database
Populate your database with the initial city dataset from `/data/cities.json`:
```bash
npm run db:seed
```

---

## Additional Commands

- **Studio View**: To view and edit your database tables visually in your browser, run:
  ```bash
  npm run db:studio
  ```
- **Enrichment Pipeline**: To run the weekly Gemini-powered city market signal enrichment script against the database:
  ```bash
  npm run db:enrich
  ```

---

## Redis Caching Setup

distribut.io uses Upstash Redis for serverless-friendly caching of expensive Gemini API calls and city database reads.

To enable caching:
1. Create a free Upstash Redis database at [upstash.com](https://upstash.com).
2. Copy the **REST URL** and **REST TOKEN** from your Upstash console.
3. Paste them into `.env.local`:
   ```env
   UPSTASH_REDIS_REST_URL=https://your-database.upstash.io
   UPSTASH_REDIS_REST_TOKEN=your_upstash_rest_token
   ```
4. Caching will activate automatically with no additional setup needed. If the environment variables are not set or Redis is unreachable, the app will safely fall back to direct execution.

---

## Three-Tier Caching System

distribut.io uses a progressive 3-tiered caching architecture for feature extraction to maximize performance, consistency, and resource efficiency across multi-field form submissions:

1. **Tier 1: Exact Match (Redis)**
   - Checks Upstash Redis for an exact hash match of the full prompt.
   - Fast-path return with `[CACHE EXACT HIT]`.

2. **Tier 2: Semantic Similarity Match (pgvector + Gemini Embeddings)**
   - Generates a vector embedding of product-defining fields (`productName`, `category`, `price`, `coldChain`, `targetCustomer`, `incomeTarget`) using Gemini `text-embedding-004` (768 dimensions).
   - Queries Postgres `analyses` table using `pgvector` cosine similarity (`1 - (embedding <=> query)`).
   - If a prior analysis matches with similarity **>= 0.90** (90%), logs `[CACHE SIMILAR MATCH]` and passes the prior analysis as reference context to Gemini for assisted, consistent feature extraction.
   - **Adjusting Similarity Threshold**: The default similarity threshold is `0.90`. To adjust it, pass a different threshold value into `findSimilarAnalysis(embedding, threshold)` in `/app/api/extract/route.ts`.

3. **Tier 3: Fresh Extraction**
   - Triggered when neither exact nor semantic matches are found. Logs `[CACHE MISS - FRESH EXTRACTION]` and executes standard Gemini extraction.

### Disabling / Fallback Behavior
- To disable semantic vector matching (e.g. if `pgvector` extension is not installed in local environment), set:
  ```env
  PGVECTOR_DISABLED=true
  ```
- If embedding generation or `pgvector` queries encounter any error, the system automatically falls through to fresh extraction (Tier 3) without failing the user request.



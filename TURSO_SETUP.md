# Turso Database Setup Guide

This guide will help you migrate from CSV files to Turso database for fast, reliable deployment.

## Why Turso?

- **Fast**: SQLite-based, similar performance to local files
- **Serverless-friendly**: Works perfectly with Vercel/Next.js
- **No rate limits**: Unlike blob storage, no throttling issues
- **Free tier**: Generous free tier for development

## Setup Steps

### 1. Create a Turso Account and Database

1. Go to [https://turso.tech](https://turso.tech) and sign up
2. Create a new database (choose a name like `inventory-tracker`)
3. Copy your database URL and auth token

### 2. Install Dependencies

```bash
npm install
```

This will install `@libsql/client` which is already added to `package.json`.

### 3. Set Environment Variables

Create a `.env.local` file in the root directory:

```env
TURSO_DATABASE_URL=libsql://your-database-name-your-org.turso.io
TURSO_AUTH_TOKEN=your-auth-token-here
```

### 4. Migrate Your Existing Data

Run the migration script to copy your CSV data to Turso:

```bash
npx tsx scripts/migrate-to-turso.ts
```

This will:

- Initialize the database schema
- Migrate all inventory items from `data/inventory.csv`
- Migrate all transactions from `data/transactions.csv`

### 5. Test Locally

Start your development server:

```bash
npm run dev
```

Your app should now work with Turso instead of CSV files!

### 6. Deploy to Vercel (or other platform)

1. Add the same environment variables in your deployment platform:

   - `TURSO_DATABASE_URL`
   - `TURSO_AUTH_TOKEN`

2. Deploy as usual. The app will automatically use Turso in production.

## Performance Benefits

- **Fast reads**: Indexed queries are much faster than parsing CSV
- **Fast writes**: Direct database inserts instead of rewriting entire files
- **Concurrent access**: Multiple users can access simultaneously without conflicts
- **No rate limits**: Unlike blob storage, no throttling

## Troubleshooting

### "Missing Turso credentials" error

Make sure your `.env.local` file has both `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` set.

### Migration fails

- Check that your CSV files exist in the `data/` directory
- Verify your Turso credentials are correct
- Make sure the database is created in your Turso dashboard

### Local development with SQLite

For local development, you can also use a local SQLite file:

```env
TURSO_DATABASE_URL=file:./local.db
```

(No auth token needed for local files)

## Alternative: Supabase

If you prefer PostgreSQL, you can use Supabase instead:

- Similar performance
- More features (auth, storage, etc.)
- Also has a generous free tier

The migration would be similar but using Supabase's client library instead.

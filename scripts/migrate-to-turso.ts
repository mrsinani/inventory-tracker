/**
 * Migration script to migrate CSV data to Turso database
 *
 * Usage:
 * 1. Set up your Turso database and get credentials
 * 2. Add TURSO_DATABASE_URL and TURSO_AUTH_TOKEN to your .env file
 * 3. Run: npx tsx scripts/migrate-to-turso.ts
 */

import dotenv from "dotenv";
import { readInventory, readTransactions } from "../lib/csv";
import { initDatabase, writeInventory, writeTransactions } from "../lib/db";

// Load environment variables from .env file
dotenv.config();

async function migrate() {
  console.log("🚀 Starting migration from CSV to Turso...\n");

  try {
    // Initialize database schema
    console.log("📦 Initializing database schema...");
    await initDatabase();
    console.log("✅ Database schema initialized\n");

    // Migrate inventory
    console.log("📋 Migrating inventory items...");
    const inventoryItems = await readInventory();
    console.log(`   Found ${inventoryItems.length} inventory items`);
    await writeInventory(inventoryItems);
    console.log("✅ Inventory migrated successfully\n");

    // Migrate transactions
    console.log("📝 Migrating transactions...");
    const transactions = await readTransactions();
    console.log(`   Found ${transactions.length} transactions`);
    await writeTransactions(transactions);
    console.log("✅ Transactions migrated successfully\n");

    console.log("🎉 Migration completed successfully!");
    console.log("\nYour data is now in Turso and ready for deployment.");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

migrate();

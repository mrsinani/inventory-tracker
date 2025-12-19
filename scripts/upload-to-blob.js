const fs = require("fs/promises");
const path = require("path");
const { put } = require("@vercel/blob");

// Load environment variables from .env file
require("dotenv").config({ path: path.join(process.cwd(), ".env") });

async function uploadToBlob() {
  const DATA_DIR = path.join(process.cwd(), "data");

  // Check if BLOB_READ_WRITE_TOKEN is set
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.error(
      "Error: BLOB_READ_WRITE_TOKEN environment variable is not set"
    );
    console.error("Please set it in your .env file");
    process.exit(1);
  }

  try {
    // Upload inventory.csv
    const inventoryPath = path.join(DATA_DIR, "inventory.csv");
    try {
      const inventoryContent = await fs.readFile(inventoryPath, "utf-8");
      const inventoryBlob = await put("inventory.csv", inventoryContent, {
        access: "public",
        contentType: "text/csv",
        allowOverwrite: true,
      });
      console.log("✓ Uploaded inventory.csv to blob:", inventoryBlob.url);
    } catch (error) {
      if (error.code === "ENOENT") {
        console.log("⚠ inventory.csv not found locally, skipping...");
      } else {
        throw error;
      }
    }

    // Upload transactions.csv
    const transactionsPath = path.join(DATA_DIR, "transactions.csv");
    try {
      const transactionsContent = await fs.readFile(transactionsPath, "utf-8");
      const transactionsBlob = await put(
        "transactions.csv",
        transactionsContent,
        {
          access: "public",
          contentType: "text/csv",
          allowOverwrite: true,
        }
      );
      console.log("✓ Uploaded transactions.csv to blob:", transactionsBlob.url);
    } catch (error) {
      if (error.code === "ENOENT") {
        console.log("⚠ transactions.csv not found locally, skipping...");
      } else {
        throw error;
      }
    }

    console.log(
      "\n✅ Migration complete! Your CSV files are now in Vercel Blob."
    );
    console.log(
      "You can now deploy to Vercel and the app will read/write from blob storage."
    );
  } catch (error) {
    console.error("Error uploading to blob:", error);
    process.exit(1);
  }
}

uploadToBlob();

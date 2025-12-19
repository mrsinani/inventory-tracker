import fs from "fs/promises";
import path from "path";
import Papa from "papaparse";
import { InventoryItem, Transaction } from "./types";

const DATA_DIR = path.join(process.cwd(), "data");

export async function ensureDataDir() {
  try {
    await fs.access(DATA_DIR);
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true });
  }
}

export async function readInventory(): Promise<InventoryItem[]> {
  try {
    const filePath = path.join(DATA_DIR, "inventory.csv");
    const fileContent = await fs.readFile(filePath, "utf-8");
    const parsed = Papa.parse<InventoryItem>(fileContent, {
      header: true,
      skipEmptyLines: true,
      transform: (value) => value.trim(),
    });
    return parsed.data;
  } catch (error) {
    console.error("Error reading inventory:", error);
    return [];
  }
}

export async function writeInventory(items: InventoryItem[]): Promise<void> {
  await ensureDataDir();
  const filePath = path.join(DATA_DIR, "inventory.csv");
  const csv = Papa.unparse(items);
  await fs.writeFile(filePath, csv, "utf-8");
}

export async function readTransactions(): Promise<Transaction[]> {
  try {
    const filePath = path.join(DATA_DIR, "transactions.csv");
    let fileContent = await fs.readFile(filePath, "utf-8");

    // Normalize line endings (CRLF -> LF) to handle mixed formats
    fileContent = fileContent.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

    // Debug: Check last few lines of file
    const lines = fileContent.split("\n").filter((line) => line.trim());
    console.log(
      "[CSV] Total non-empty lines in transactions.csv:",
      lines.length
    );
    console.log("[CSV] Last 3 lines:", lines.slice(-3));

    const parsed = Papa.parse<Transaction>(fileContent, {
      header: true,
      skipEmptyLines: true,
      transform: (value) => value.trim(),
    });

    console.log("[CSV] Parsed transactions count:", parsed.data.length);
    if (parsed.errors.length > 0) {
      console.log("[CSV] Parse errors:", parsed.errors);
    }

    // Debug: Check last 3 parsed rows
    const lastRows = parsed.data.slice(-3);
    console.log(
      "[CSV] Last 3 parsed rows:",
      lastRows.map((t) => ({
        id: t.id?.slice(0, 8),
        inventory_id: t.inventory_id?.slice(0, 8),
        status: t.status,
      }))
    );

    // Debug: Check for pending transactions
    const pendingCount = parsed.data.filter(
      (t) => t.status === "pending"
    ).length;
    console.log("[CSV] Pending transactions count:", pendingCount);

    return parsed.data;
  } catch (error) {
    console.error("Error reading transactions:", error);
    return [];
  }
}

export async function appendTransaction(
  transaction: Transaction
): Promise<void> {
  await ensureDataDir();
  const filePath = path.join(DATA_DIR, "transactions.csv");

  // Ensure consumption field exists (for CSV compatibility with header)
  const transactionWithConsumption = {
    ...transaction,
    consumption: transaction.consumption || "0",
  };

  // Define column order to match CSV header
  const columns = [
    "id",
    "inventory_id",
    "timestamp",
    "ordered_quantity",
    "actual_received",
    "previous_stock",
    "new_stock",
    "consumption",
    "status",
    "notes",
  ];

  try {
    await fs.access(filePath);
    // Use PapaParse with explicit columns to preserve order
    const csv = Papa.unparse([transactionWithConsumption], {
      header: false,
      columns: columns as (keyof Transaction)[],
    });
    await fs.appendFile(filePath, "\n" + csv, "utf-8");
  } catch {
    // File doesn't exist, create with header
    const csv = Papa.unparse([transactionWithConsumption], {
      header: true,
      columns: columns as (keyof Transaction)[],
    });
    await fs.writeFile(filePath, csv, "utf-8");
  }
}

export function isLowStock(item: InventoryItem): boolean {
  const stockOnHand = parseFloat(item.stock_on_hand) || 0;
  const stockUp = parseFloat(item.stock_up) || 0;
  return stockOnHand < stockUp;
}

export function calculateConsumption(
  previousStock: number,
  actualReceived: number,
  newStock: number
): number {
  return previousStock + actualReceived - newStock;
}

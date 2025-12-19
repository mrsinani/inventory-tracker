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

    const lines = fileContent.split("\n").filter((line) => line.trim());
    console.log("[CSV] readTransactions - non-empty lines:", lines.length);

    const parsed = Papa.parse<Transaction>(fileContent, {
      header: true,
      skipEmptyLines: true,
      transform: (value) => value.trim(),
    });

    if (parsed.errors.length > 0) {
      console.error("[CSV] Parse errors:", parsed.errors);
    }

    return parsed.data;
  } catch (error) {
    console.error("Error reading transactions:", error);
    return [];
  }
}

export async function writeTransactions(
  transactions: Transaction[]
): Promise<void> {
  await ensureDataDir();

  // Ensure all transactions have consumption field
  const transactionsWithConsumption = transactions.map((t) => ({
    ...t,
    consumption: t.consumption || "0",
  }));

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

  const csv = Papa.unparse(transactionsWithConsumption, {
    header: true,
    columns: columns as (keyof Transaction)[],
  });

  const filePath = path.join(DATA_DIR, "transactions.csv");
  await fs.writeFile(filePath, csv, "utf-8");
}

export async function appendTransaction(
  transaction: Transaction
): Promise<void> {
  // Read existing transactions
  const existingTransactions = await readTransactions();

  // Append new transaction
  const allTransactions = [...existingTransactions, transaction];

  // Write all transactions back to file
  await writeTransactions(allTransactions);
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

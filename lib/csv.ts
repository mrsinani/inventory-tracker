import fs from 'fs/promises';
import path from 'path';
import Papa from 'papaparse';
import { InventoryItem, Transaction } from './types';

const DATA_DIR = path.join(process.cwd(), 'data');

export async function ensureDataDir() {
  try {
    await fs.access(DATA_DIR);
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true });
  }
}

export async function readInventory(): Promise<InventoryItem[]> {
  try {
    const filePath = path.join(DATA_DIR, 'inventory.csv');
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const parsed = Papa.parse<InventoryItem>(fileContent, {
      header: true,
      skipEmptyLines: true,
      transform: (value) => value.trim()
    });
    return parsed.data;
  } catch (error) {
    console.error('Error reading inventory:', error);
    return [];
  }
}

export async function writeInventory(items: InventoryItem[]): Promise<void> {
  await ensureDataDir();
  const filePath = path.join(DATA_DIR, 'inventory.csv');
  const csv = Papa.unparse(items);
  await fs.writeFile(filePath, csv, 'utf-8');
}

export async function readTransactions(): Promise<Transaction[]> {
  try {
    const filePath = path.join(DATA_DIR, 'transactions.csv');
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const parsed = Papa.parse<Transaction>(fileContent, {
      header: true,
      skipEmptyLines: true,
      transform: (value) => value.trim()
    });
    return parsed.data;
  } catch (error) {
    console.error('Error reading transactions:', error);
    return [];
  }
}

export async function appendTransaction(transaction: Transaction): Promise<void> {
  await ensureDataDir();
  const filePath = path.join(DATA_DIR, 'transactions.csv');

  try {
    await fs.access(filePath);
    const csv = Papa.unparse([transaction], { header: false });
    await fs.appendFile(filePath, '\n' + csv, 'utf-8');
  } catch {
    const csv = Papa.unparse([transaction], { header: true });
    await fs.writeFile(filePath, csv, 'utf-8');
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

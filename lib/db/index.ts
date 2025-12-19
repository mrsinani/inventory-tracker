import { createClient } from "@libsql/client";
import { InventoryItem, Transaction } from "../types";

// Initialize Turso client
let client: ReturnType<typeof createClient> | null = null;

function getClient() {
  if (!client) {
    const url = process.env.TURSO_DATABASE_URL;
    const authToken = process.env.TURSO_AUTH_TOKEN;

    if (!url || !authToken) {
      throw new Error(
        "Missing Turso credentials. Please set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN environment variables."
      );
    }

    client = createClient({
      url,
      authToken,
    });
  }
  return client;
}

// Cache initialization state to avoid running on every request
let initPromise: Promise<void> | null = null;
let isInitialized = false;

// Initialize database schema
export async function initDatabase() {
  // If already initialized, skip
  if (isInitialized) {
    return;
  }

  // If initialization is in progress, wait for it
  if (initPromise) {
    return initPromise;
  }

  // Start initialization
  initPromise = (async () => {
    const db = getClient();

    // Enable foreign key constraints (SQLite requires this)
    await db.execute("PRAGMA foreign_keys = ON");

    // Turso requires each statement to be executed separately
    const statements = [
      `CREATE TABLE IF NOT EXISTS inventory (
        id TEXT PRIMARY KEY,
        item TEXT NOT NULL,
        room TEXT NOT NULL,
        price TEXT NOT NULL,
        stock_up TEXT NOT NULL,
        vendor TEXT NOT NULL,
        method TEXT NOT NULL,
        department TEXT NOT NULL,
        units TEXT NOT NULL,
        stock_on_hand TEXT NOT NULL DEFAULT '0'
      )`,
      `CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY,
        inventory_id TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        ordered_quantity TEXT NOT NULL,
        actual_received TEXT NOT NULL,
        previous_stock TEXT NOT NULL,
        new_stock TEXT NOT NULL,
        consumption TEXT NOT NULL DEFAULT '0',
        status TEXT NOT NULL CHECK(status IN ('pending', 'completed')),
        notes TEXT DEFAULT '',
        FOREIGN KEY (inventory_id) REFERENCES inventory(id)
      )`,
      `CREATE INDEX IF NOT EXISTS idx_transactions_inventory_id ON transactions(inventory_id)`,
      `CREATE INDEX IF NOT EXISTS idx_transactions_timestamp ON transactions(timestamp DESC)`,
      `CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status)`,
    ];

    // Execute each statement separately
    for (const statement of statements) {
      await db.execute(statement);
    }

    // Mark as initialized
    isInitialized = true;
  })();

  try {
    await initPromise;
  } catch (error) {
    // On failure, reset so we can retry
    initPromise = null;
    isInitialized = false;
    throw error;
  }
}

// Inventory operations
export async function readInventory(): Promise<InventoryItem[]> {
  const db = getClient();
  const result = await db.execute("SELECT * FROM inventory ORDER BY item");
  return result.rows.map((row: any) => ({
    id: row.id as string,
    item: row.item as string,
    room: row.room as string,
    price: row.price as string,
    stock_up: row.stock_up as string,
    vendor: row.vendor as string,
    method: row.method as string,
    department: row.department as string,
    units: row.units as string,
    stock_on_hand: row.stock_on_hand as string,
  }));
}

export async function getInventoryItem(
  id: string
): Promise<InventoryItem | null> {
  const db = getClient();
  const result = await db.execute({
    sql: "SELECT * FROM inventory WHERE id = ?",
    args: [id],
  });

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];
  return {
    id: row.id as string,
    item: row.item as string,
    room: row.room as string,
    price: row.price as string,
    stock_up: row.stock_up as string,
    vendor: row.vendor as string,
    method: row.method as string,
    department: row.department as string,
    units: row.units as string,
    stock_on_hand: row.stock_on_hand as string,
  };
}

export async function writeInventory(items: InventoryItem[]): Promise<void> {
  const db = getClient();

  // Use a transaction for atomicity
  const statements = [
    { sql: "DELETE FROM inventory", args: [] },
    ...items.map((item) => ({
      sql: `INSERT INTO inventory (id, item, room, price, stock_up, vendor, method, department, units, stock_on_hand)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        item.id,
        item.item,
        item.room,
        item.price,
        item.stock_up,
        item.vendor,
        item.method,
        item.department,
        item.units,
        item.stock_on_hand,
      ],
    })),
  ];

  await db.batch(statements);
}

// Optimized single-item operations
export async function insertInventoryItem(item: InventoryItem): Promise<void> {
  const db = getClient();
  await db.execute({
    sql: `INSERT INTO inventory (id, item, room, price, stock_up, vendor, method, department, units, stock_on_hand)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      item.id,
      item.item,
      item.room,
      item.price,
      item.stock_up,
      item.vendor,
      item.method,
      item.department,
      item.units,
      item.stock_on_hand,
    ],
  });
}

export async function updateInventoryItem(item: InventoryItem): Promise<void> {
  const db = getClient();
  await db.execute({
    sql: `UPDATE inventory 
          SET item = ?, room = ?, price = ?, stock_up = ?, vendor = ?, method = ?, department = ?, units = ?, stock_on_hand = ?
          WHERE id = ?`,
    args: [
      item.item,
      item.room,
      item.price,
      item.stock_up,
      item.vendor,
      item.method,
      item.department,
      item.units,
      item.stock_on_hand,
      item.id,
    ],
  });
}

export async function deleteInventoryItem(id: string): Promise<void> {
  const db = getClient();
  await db.execute({
    sql: "DELETE FROM inventory WHERE id = ?",
    args: [id],
  });
}

// Transaction operations
export async function readTransactions(
  inventoryId?: string
): Promise<Transaction[]> {
  const db = getClient();

  let sql = "SELECT * FROM transactions";
  const args: any[] = [];

  if (inventoryId) {
    sql += " WHERE inventory_id = ?";
    args.push(inventoryId);
  }

  sql += " ORDER BY timestamp DESC";

  const result = await db.execute({ sql, args });
  return result.rows.map((row: any) => ({
    id: row.id as string,
    inventory_id: row.inventory_id as string,
    timestamp: row.timestamp as string,
    ordered_quantity: row.ordered_quantity as string,
    actual_received: row.actual_received as string,
    previous_stock: row.previous_stock as string,
    new_stock: row.new_stock as string,
    consumption: (row.consumption as string) || "0",
    status: row.status as "pending" | "completed",
    notes: (row.notes as string) || "",
  }));
}

export async function writeTransactions(
  transactions: Transaction[]
): Promise<void> {
  const db = getClient();

  // Use a transaction for atomicity
  const statements = [
    { sql: "DELETE FROM transactions", args: [] },
    ...transactions.map((t) => ({
      sql: `INSERT INTO transactions (id, inventory_id, timestamp, ordered_quantity, actual_received, previous_stock, new_stock, consumption, status, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        t.id,
        t.inventory_id,
        t.timestamp,
        t.ordered_quantity,
        t.actual_received,
        t.previous_stock,
        t.new_stock,
        t.consumption || "0",
        t.status,
        t.notes || "",
      ],
    })),
  ];

  await db.batch(statements);
}

export async function updateTransaction(
  transaction: Transaction
): Promise<void> {
  const db = getClient();
  await db.execute({
    sql: `UPDATE transactions 
          SET inventory_id = ?, timestamp = ?, ordered_quantity = ?, actual_received = ?, previous_stock = ?, new_stock = ?, consumption = ?, status = ?, notes = ?
          WHERE id = ?`,
    args: [
      transaction.inventory_id,
      transaction.timestamp,
      transaction.ordered_quantity,
      transaction.actual_received,
      transaction.previous_stock,
      transaction.new_stock,
      transaction.consumption || "0",
      transaction.status,
      transaction.notes || "",
      transaction.id,
    ],
  });
}

export async function deleteTransaction(id: string): Promise<void> {
  const db = getClient();
  await db.execute({
    sql: "DELETE FROM transactions WHERE id = ?",
    args: [id],
  });
}

export async function getTransaction(id: string): Promise<Transaction | null> {
  const db = getClient();
  const result = await db.execute({
    sql: "SELECT * FROM transactions WHERE id = ?",
    args: [id],
  });

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];
  return {
    id: row.id as string,
    inventory_id: row.inventory_id as string,
    timestamp: row.timestamp as string,
    ordered_quantity: row.ordered_quantity as string,
    actual_received: row.actual_received as string,
    previous_stock: row.previous_stock as string,
    new_stock: row.new_stock as string,
    consumption: (row.consumption as string) || "0",
    status: row.status as "pending" | "completed",
    notes: (row.notes as string) || "",
  };
}

export async function appendTransaction(
  transaction: Transaction
): Promise<void> {
  const db = getClient();
  await db.execute({
    sql: `INSERT INTO transactions (id, inventory_id, timestamp, ordered_quantity, actual_received, previous_stock, new_stock, consumption, status, notes)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      transaction.id,
      transaction.inventory_id,
      transaction.timestamp,
      transaction.ordered_quantity,
      transaction.actual_received,
      transaction.previous_stock,
      transaction.new_stock,
      transaction.consumption || "0",
      transaction.status,
      transaction.notes || "",
    ],
  });
}

// Helper functions (same as CSV version)
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

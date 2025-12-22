-- Inventory items table
CREATE TABLE IF NOT EXISTS inventory (
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
);

-- Transactions table
CREATE TABLE IF NOT EXISTS transactions (
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
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_transactions_inventory_id ON transactions(inventory_id);
CREATE INDEX IF NOT EXISTS idx_transactions_timestamp ON transactions(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);



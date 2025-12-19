export interface InventoryItem {
  id: string;
  item: string;
  room: string;
  price: string;
  stock_up: string;
  vendor: string;
  method: string;
  department: string;
  units: string;
  stock_on_hand: string;
}

export interface Transaction {
  id: string;
  inventory_id: string;
  timestamp: string;
  ordered_quantity: string;
  actual_received: string;
  previous_stock: string;
  new_stock: string;
  // Legacy field from earlier versions; no longer used in the UI or logic
  consumption?: string;
  status: "pending" | "completed";
  notes?: string;
}

export interface StockUpdateInput {
  ordered_quantity: number;
  actual_received: number;
  new_stock: number;
  notes?: string;
}

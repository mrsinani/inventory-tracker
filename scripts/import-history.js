const XLSX = require("xlsx");
const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const Papa = require("papaparse");

// Read the Excel file
const excelPath = path.join(__dirname, "../.danaid/inventory test.xlsx");
const workbook = XLSX.readFile(excelPath);
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];

// Convert to JSON
const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

// Read current inventory to get item IDs
const inventoryPath = path.join(__dirname, "../data/inventory.csv");
const inventoryCSV = fs.readFileSync(inventoryPath, "utf-8");
const inventoryData = Papa.parse(inventoryCSV, {
  header: true,
  skipEmptyLines: true,
});
const inventory = inventoryData.data;

// Create a map of item names to IDs
const itemNameToId = {};
inventory.forEach((item) => {
  itemNameToId[item.item.trim()] = item.id;
});

const excelHeaders = jsonData[2] || [];
const itemIndex = excelHeaders.indexOf("Items");

// Find all the date columns
const dateColumns = [];
excelHeaders.forEach((header, index) => {
  if (header && typeof header === "string") {
    // Match patterns like "Stock on hand: 11/10", "Stock on hand: 12/15", etc.
    const stockMatch = header.match(/Stock on hand[:\s]+(\d+\/\d+)/i);
    if (stockMatch) {
      const dateStr = stockMatch[1]; // e.g., "11/10", "12/15"

      // Find the corresponding restock/purchase column
      // Look for columns like "Restock: 11/10", "Purchase: 12/8", "Actual restock: 12/8", etc.
      let restockIndex = -1;
      let restockHeader = "";

      // Search nearby columns for restock/purchase data
      for (let i = index - 2; i <= index + 2; i++) {
        if (i >= 0 && i < excelHeaders.length && excelHeaders[i]) {
          const nearbyHeader = excelHeaders[i].toString();
          if (
            (nearbyHeader.toLowerCase().includes("restock") ||
              nearbyHeader.toLowerCase().includes("purchase")) &&
            nearbyHeader.includes(dateStr)
          ) {
            restockIndex = i;
            restockHeader = nearbyHeader;
            break;
          }
        }
      }

      dateColumns.push({
        date: dateStr,
        stockIndex: index,
        restockIndex: restockIndex,
        restockHeader: restockHeader,
      });
    }
  }
});

console.log(
  `Found ${dateColumns.length} date columns:`,
  dateColumns.map((d) => d.date)
);

// Create transactions
const transactions = [];

// Process each item (starting from row 3)
for (let i = 3; i < jsonData.length; i++) {
  const row = jsonData[i];

  if (!row || !row[itemIndex]) {
    continue;
  }

  const itemName = String(row[itemIndex] || "").trim();
  if (!itemName) {
    continue;
  }

  const inventoryId = itemNameToId[itemName];
  if (!inventoryId) {
    console.log(`Warning: Item "${itemName}" not found in inventory`);
    continue;
  }

  let previousStock = 0;

  // Process each date column
  dateColumns.forEach((dateCol, idx) => {
    const stockOnHand = row[dateCol.stockIndex];
    const restockAmount =
      dateCol.restockIndex >= 0 ? row[dateCol.restockIndex] : 0;

    // Skip if no stock data
    if (
      stockOnHand === undefined ||
      stockOnHand === null ||
      stockOnHand === ""
    ) {
      return;
    }

    const currentStock = parseFloat(stockOnHand) || 0;
    const restock = parseFloat(restockAmount) || 0;

    // Consumption is no longer used in the app; keep column for legacy data
    const consumption = 0;

    // Parse date (format is M/D, we'll assume 2024 as year)
    const [month, day] = dateCol.date.split("/");
    // If month is 11 or 12, use 2024, otherwise use 2025 (for January dates)
    const year = parseInt(month) >= 11 ? 2024 : 2025;
    const timestamp = new Date(
      year,
      parseInt(month) - 1,
      parseInt(day),
      12,
      0,
      0
    ).toISOString();

    // Create transaction
    const transaction = {
      id: uuidv4(),
      inventory_id: inventoryId,
      timestamp: timestamp,
      ordered_quantity: restock.toString(),
      actual_received: restock.toString(),
      previous_stock: previousStock.toString(),
      new_stock: currentStock.toString(),
      consumption: consumption.toString(),
      status: "completed",
      notes: `Imported from Excel - ${dateCol.date}${
        dateCol.restockHeader ? ` (${dateCol.restockHeader})` : ""
      }`,
    };

    transactions.push(transaction);
    previousStock = currentStock;
  });
}

console.log(`Created ${transactions.length} transactions from historical data`);

// Read existing transactions to preserve any new ones
const transactionsPath = path.join(__dirname, "../data/transactions.csv");
let existingTransactions = [];
try {
  const existingCSV = fs.readFileSync(transactionsPath, "utf-8");
  const parsed = Papa.parse(existingCSV, {
    header: true,
    skipEmptyLines: true,
  });
  existingTransactions = parsed.data.filter(
    (t) => t.id && !t.notes?.includes("Imported from Excel")
  );
  console.log(
    `Found ${existingTransactions.length} existing transactions to preserve`
  );
} catch (err) {
  console.log("No existing transactions to preserve");
}

// Combine historical and existing transactions
const allTransactions = [...transactions, ...existingTransactions];

// Sort transactions by timestamp
allTransactions.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

// Write to transactions.csv
const csv = Papa.unparse(allTransactions);
fs.writeFileSync(transactionsPath, csv, "utf-8");

console.log(
  `✅ Successfully imported ${transactions.length} historical transactions to ${transactionsPath}`
);

// Show sample
console.log(`\nSample transactions:`);
transactions.slice(0, 5).forEach((t) => {
  const item = inventory.find((i) => i.id === t.inventory_id);
  console.log(
    `- ${item?.item || "Unknown"}: ${t.previous_stock} → ${
      t.new_stock
    } (received: ${t.actual_received}) on ${new Date(
      t.timestamp
    ).toLocaleDateString()}`
  );
});

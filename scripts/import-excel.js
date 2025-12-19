const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Read the Excel file
const excelPath = path.join(__dirname, '../.danaid/inventory test.xlsx');
const workbook = XLSX.readFile(excelPath);
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];

// Convert to JSON without using headers (since headers are on row 3)
const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

// Process and map data
const inventoryItems = [];

// Row 0: instruction text
// Row 1: empty or "Name"
// Row 2: actual headers
// Row 3+: data

const excelHeaders = jsonData[2] || [];
const itemIndex = excelHeaders.indexOf('Items');
const roomIndex = excelHeaders.indexOf('Room');
const priceIndex = excelHeaders.indexOf('Price');
const stockUpIndex = excelHeaders.indexOf('Stock up');
const vendorIndex = excelHeaders.indexOf('Vendor');
const methodIndex = excelHeaders.indexOf('Method');
const deptIndex = excelHeaders.indexOf('Department');
const unitsIndex = excelHeaders.indexOf('Units');
const stockOnHandIndex = excelHeaders.findIndex(h => h && h.toString().includes('Stock on hand: 12/15'));

console.log('Found headers at indices:', {
  item: itemIndex, room: roomIndex, price: priceIndex,
  stockUp: stockUpIndex, stockOnHand: stockOnHandIndex
});

// Process data rows (starting from row 3)
for (let i = 3; i < jsonData.length; i++) {
  const row = jsonData[i];

  if (!row || !row[itemIndex]) {
    continue;
  }

  const itemName = String(row[itemIndex] || '').trim();

  // Skip empty items
  if (!itemName) {
    continue;
  }

  const item = {
    id: uuidv4(),
    item: itemName,
    room: String(row[roomIndex] || '').trim(),
    price: String(row[priceIndex] || '').trim(),
    stock_up: String(row[stockUpIndex] || '').trim(),
    vendor: String(row[vendorIndex] || '').trim(),
    method: String(row[methodIndex] || '').trim(),
    department: String(row[deptIndex] || '').trim(),
    units: String(row[unitsIndex] || '').trim(),
    stock_on_hand: String(row[stockOnHandIndex] || '0').trim()
  };

  inventoryItems.push(item);
}

// Convert to CSV format
const headers = ['id', 'item', 'room', 'price', 'stock_up', 'vendor', 'method', 'department', 'units', 'stock_on_hand'];
const csvRows = [headers.join(',')];

inventoryItems.forEach(item => {
  const row = headers.map(header => {
    const value = item[header] || '';
    // Escape commas and quotes
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  });
  csvRows.push(row.join(','));
});

// Write to CSV
const csvPath = path.join(__dirname, '../data/inventory.csv');
fs.writeFileSync(csvPath, csvRows.join('\n'), 'utf-8');

console.log(`✅ Successfully imported ${inventoryItems.length} items to ${csvPath}`);
console.log(`\nSample items:`);
inventoryItems.slice(0, 3).forEach(item => {
  console.log(`- ${item.item} (Stock: ${item.stock_on_hand}, Room: ${item.room})`);
});

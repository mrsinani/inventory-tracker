import { NextRequest, NextResponse } from 'next/server';
import { readInventory, writeInventory, appendTransaction, calculateConsumption, readTransactions } from '@/lib/csv';
import { Transaction } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs/promises';
import path from 'path';
import Papa from 'papaparse';

// PATCH /api/inventory/[id]/stock - Update stock with transaction workflow
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { ordered_quantity, actual_received, new_stock, notes, pending_order_id } = body;

    // Validation
    if (
      ordered_quantity === undefined ||
      actual_received === undefined ||
      new_stock === undefined
    ) {
      return NextResponse.json(
        { error: 'Missing required fields: ordered_quantity, actual_received, new_stock' },
        { status: 400 }
      );
    }

    const orderedQty = parseFloat(ordered_quantity);
    const actualReceived = parseFloat(actual_received);
    const newStockQty = parseFloat(new_stock);

    if (isNaN(orderedQty) || isNaN(actualReceived) || isNaN(newStockQty)) {
      return NextResponse.json(
        { error: 'All quantities must be valid numbers' },
        { status: 400 }
      );
    }

    if (orderedQty < 0 || actualReceived < 0 || newStockQty < 0) {
      return NextResponse.json(
        { error: 'Quantities cannot be negative' },
        { status: 400 }
      );
    }

    // Read current inventory
    const items = await readInventory();
    const itemIndex = items.findIndex(item => item.id === params.id);

    if (itemIndex === -1) {
      return NextResponse.json(
        { error: 'Item not found' },
        { status: 404 }
      );
    }

    const item = items[itemIndex];
    const previousStock = parseFloat(item.stock_on_hand) || 0;

    // Calculate consumption
    const consumption = calculateConsumption(previousStock, actualReceived, newStockQty);

    // Update stock_on_hand
    items[itemIndex] = {
      ...item,
      stock_on_hand: newStockQty.toString()
    };

    await writeInventory(items);

    // If completing a pending order, update it instead of creating new
    if (pending_order_id) {
      // Update the pending transaction to completed
      const transactions = await readTransactions();
      const pendingIndex = transactions.findIndex(t => t.id === pending_order_id);

      if (pendingIndex !== -1) {
        transactions[pendingIndex] = {
          ...transactions[pendingIndex],
          actual_received: actualReceived.toString(),
          new_stock: newStockQty.toString(),
          consumption: consumption.toString(),
          status: 'completed',
          notes: notes || transactions[pendingIndex].notes || ''
        };

        // Write updated transactions back to file
        const DATA_DIR = path.join(process.cwd(), 'data');
        const filePath = path.join(DATA_DIR, 'transactions.csv');
        const csv = Papa.unparse(transactions);
        await fs.writeFile(filePath, csv, 'utf-8');

        return NextResponse.json({
          item: items[itemIndex],
          transaction: transactions[pendingIndex]
        });
      }
    }

    // Create new transaction record
    const transaction: Transaction = {
      id: uuidv4(),
      inventory_id: params.id,
      timestamp: new Date().toISOString(),
      ordered_quantity: orderedQty.toString(),
      actual_received: actualReceived.toString(),
      previous_stock: previousStock.toString(),
      new_stock: newStockQty.toString(),
      consumption: consumption.toString(),
      status: 'completed',
      notes: notes || ''
    };

    await appendTransaction(transaction);

    return NextResponse.json({
      item: items[itemIndex],
      transaction
    });
  } catch (error) {
    console.error('Error updating stock:', error);
    return NextResponse.json(
      { error: 'Failed to update stock' },
      { status: 500 }
    );
  }
}

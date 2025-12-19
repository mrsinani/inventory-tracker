import { NextRequest, NextResponse } from 'next/server';
import { readTransactions, readInventory, writeInventory } from '@/lib/csv';
import fs from 'fs/promises';
import path from 'path';
import Papa from 'papaparse';

// DELETE /api/transactions/[id] - Delete a transaction and revert stock changes
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const transactionId = params.id;

    // Read all transactions
    const transactions = await readTransactions();
    const transactionIndex = transactions.findIndex(t => t.id === transactionId);

    if (transactionIndex === -1) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      );
    }

    const transaction = transactions[transactionIndex];

    // If this is a completed transaction, revert the stock change
    if (transaction.status === 'completed') {
      const items = await readInventory();
      const itemIndex = items.findIndex(i => i.id === transaction.inventory_id);

      if (itemIndex !== -1) {
        // Revert to previous stock
        items[itemIndex].stock_on_hand = transaction.previous_stock;
        await writeInventory(items);
      }
    }

    // Remove the transaction
    transactions.splice(transactionIndex, 1);

    // Write updated transactions back to file
    const DATA_DIR = path.join(process.cwd(), 'data');
    const filePath = path.join(DATA_DIR, 'transactions.csv');
    const csv = Papa.unparse(transactions);
    await fs.writeFile(filePath, csv, 'utf-8');

    return NextResponse.json({
      success: true,
      message: 'Transaction deleted and stock reverted'
    });
  } catch (error) {
    console.error('Error deleting transaction:', error);
    return NextResponse.json(
      { error: 'Failed to delete transaction' },
      { status: 500 }
    );
  }
}

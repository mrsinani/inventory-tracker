import { NextRequest, NextResponse } from 'next/server';
import { readTransactions, readInventory, writeInventory, writeTransactions } from '@/lib/csv';

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

    // Remove the transaction first
    transactions.splice(transactionIndex, 1);

    // Recompute the item's stock based on remaining completed transactions
    if (transaction.status === 'completed') {
      const items = await readInventory();
      const itemIndex = items.findIndex(i => i.id === transaction.inventory_id);

      if (itemIndex !== -1) {
        // Find the latest completed transaction for this item (after deletion)
        const remainingForItem = transactions
          .filter(t => t.inventory_id === transaction.inventory_id && t.status === 'completed')
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        if (remainingForItem.length > 0) {
          // Set stock to the most recent completed transaction's new_stock
          items[itemIndex].stock_on_hand = remainingForItem[0].new_stock;
        } else {
          // No completed transactions remain; fall back to the deleted transaction's previous stock
          items[itemIndex].stock_on_hand = transaction.previous_stock;
        }

        await writeInventory(items);
      }
    }

    // Write updated transactions back to blob
    await writeTransactions(transactions);

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

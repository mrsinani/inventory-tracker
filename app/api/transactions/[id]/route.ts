import { NextRequest, NextResponse } from 'next/server';
import { readTransactions, getInventoryItem, updateInventoryItem, getTransaction, deleteTransaction, initDatabase } from '@/lib/db';

// DELETE /api/transactions/[id] - Delete a transaction and revert stock changes
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await initDatabase();
    const transactionId = params.id;

    // Get transaction directly (much faster than fetching all)
    const transaction = await getTransaction(transactionId);

    if (!transaction) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      );
    }

    // Recompute the item's stock based on remaining completed transactions (before deletion)
    if (transaction.status === 'completed') {
      const item = await getInventoryItem(transaction.inventory_id);

      if (item) {
        // Find the latest completed transaction for this item (excluding the one we're deleting)
        const remainingForItem = await readTransactions(transaction.inventory_id);
        const latestCompleted = remainingForItem
          .filter(t => t.id !== transactionId && t.status === 'completed')
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];

        const updatedItem = {
          ...item,
          stock_on_hand: latestCompleted 
            ? latestCompleted.new_stock 
            : transaction.previous_stock
        };

        await updateInventoryItem(updatedItem);
      }
    }

    // Delete the transaction using optimized function
    await deleteTransaction(transactionId);

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

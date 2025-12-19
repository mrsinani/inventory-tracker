import { NextRequest, NextResponse } from 'next/server';
import { readTransactions } from '@/lib/csv';

// GET /api/transactions - Get all transactions or filter by inventory_id
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const inventoryId = searchParams.get('inventory_id');

    let transactions = await readTransactions();
    console.log(
      '[API/transactions] GET',
      inventoryId ? `inventory_id=${inventoryId}` : 'all',
      '- total:',
      transactions.length
    );

    // Filter by inventory_id if provided
    if (inventoryId) {
      transactions = transactions.filter(t => t.inventory_id === inventoryId);
    }

    // Sort by timestamp descending (newest first)
    transactions.sort((a, b) => {
      const dateA = new Date(a.timestamp).getTime();
      const dateB = new Date(b.timestamp).getTime();
      return dateB - dateA;
    });

    return NextResponse.json(transactions);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transactions' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { readTransactions, initDatabase } from '@/lib/db';

// GET /api/transactions - Get all transactions or filter by inventory_id
export async function GET(request: NextRequest) {
  try {
    await initDatabase();
    const { searchParams } = new URL(request.url);
    const inventoryId = searchParams.get('inventory_id');

    // Pass inventoryId directly to database query for efficient filtering
    const transactions = await readTransactions(inventoryId || undefined);
    console.log(
      '[API/transactions] GET',
      inventoryId ? `inventory_id=${inventoryId}` : 'all',
      '- total:',
      transactions.length
    );

    return NextResponse.json(transactions);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transactions' },
      { status: 500 }
    );
  }
}

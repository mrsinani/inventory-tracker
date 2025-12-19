import { NextRequest, NextResponse } from 'next/server';
import { readTransactions } from '@/lib/csv';

// GET /api/transactions - Get all transactions or filter by inventory_id
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const inventoryId = searchParams.get('inventory_id');

    console.log('[API/transactions] GET request - inventory_id filter:', inventoryId);

    let transactions = await readTransactions();
    console.log('[API/transactions] Total transactions read:', transactions.length);

    // Filter by inventory_id if provided
    if (inventoryId) {
      const beforeFilter = transactions.length;
      transactions = transactions.filter(t => t.inventory_id === inventoryId);
      console.log('[API/transactions] After inventory_id filter:', transactions.length, '(was', beforeFilter, ')');
      
      // Log the statuses of filtered transactions
      const statuses = transactions.map(t => ({ id: t.id.slice(0, 8), status: t.status, statusType: typeof t.status }));
      console.log('[API/transactions] Transaction statuses:', JSON.stringify(statuses));
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

import { NextRequest, NextResponse } from 'next/server';
import { readInventory, appendTransaction } from '@/lib/csv';
import { Transaction } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';

// POST /api/orders - Create a pending order
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { inventory_id, ordered_quantity, notes } = body;

    if (!inventory_id || !ordered_quantity) {
      return NextResponse.json(
        { error: 'Missing required fields: inventory_id, ordered_quantity' },
        { status: 400 }
      );
    }

    const orderedQty = parseFloat(ordered_quantity);

    if (isNaN(orderedQty) || orderedQty <= 0) {
      return NextResponse.json(
        { error: 'Ordered quantity must be a positive number' },
        { status: 400 }
      );
    }

    // Verify item exists
    const items = await readInventory();
    const item = items.find(i => i.id === inventory_id);

    if (!item) {
      return NextResponse.json(
        { error: 'Item not found' },
        { status: 404 }
      );
    }

    const currentStock = parseFloat(item.stock_on_hand) || 0;

    // Create pending transaction
    const transaction: Transaction = {
      id: uuidv4(),
      inventory_id,
      timestamp: new Date().toISOString(),
      ordered_quantity: orderedQty.toString(),
      actual_received: '0',
      previous_stock: currentStock.toString(),
      new_stock: currentStock.toString(),
      consumption: '0',
      status: 'pending',
      notes: notes || ''
    };

    await appendTransaction(transaction);

    return NextResponse.json(transaction, { status: 201 });
  } catch (error) {
    console.error('Error creating order:', error);
    return NextResponse.json(
      { error: 'Failed to create order' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { readInventory, readTransactions, insertInventoryItem, updateInventoryItem, deleteInventoryItem, deleteTransaction, initDatabase } from '@/lib/db';
import { InventoryItem } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';

// GET /api/inventory - Get all inventory items
export async function GET() {
  try {
    await initDatabase();
    const items = await readInventory();
    return NextResponse.json(items);
  } catch (error) {
    console.error('Error fetching inventory:', error);
    return NextResponse.json(
      { error: 'Failed to fetch inventory' },
      { status: 500 }
    );
  }
}

// POST /api/inventory - Create a new inventory item
export async function POST(request: NextRequest) {
  try {
    await initDatabase();
    const body = await request.json();

    const newItem: InventoryItem = {
      id: uuidv4(),
      item: body.item || '',
      room: body.room || '',
      price: body.price || '',
      stock_up: body.stock_up || '',
      vendor: body.vendor || '',
      method: body.method || '',
      department: body.department || '',
      units: body.units || '',
      stock_on_hand: body.stock_on_hand || '0'
    };

    await insertInventoryItem(newItem);

    return NextResponse.json(newItem, { status: 201 });
  } catch (error) {
    console.error('Error creating item:', error);
    return NextResponse.json(
      { error: 'Failed to create item' },
      { status: 500 }
    );
  }
}

// PUT /api/inventory - Update an existing item (not stock update)
export async function PUT(request: NextRequest) {
  try {
    await initDatabase();
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Item ID is required' },
        { status: 400 }
      );
    }

    const items = await readInventory();
    const existingItem = items.find(item => item.id === id);

    if (!existingItem) {
      return NextResponse.json(
        { error: 'Item not found' },
        { status: 404 }
      );
    }

    // Update item (preserve stock_on_hand unless explicitly updating)
    const updatedItem: InventoryItem = {
      ...existingItem,
      ...updates,
      id // Ensure ID doesn't change
    };

    await updateInventoryItem(updatedItem);

    return NextResponse.json(updatedItem);
  } catch (error) {
    console.error('Error updating item:', error);
    return NextResponse.json(
      { error: 'Failed to update item' },
      { status: 500 }
    );
  }
}

// DELETE /api/inventory - Delete an item
export async function DELETE(request: NextRequest) {
  try {
    await initDatabase();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Item ID is required' },
        { status: 400 }
      );
    }

    const items = await readInventory();
    const item = items.find(item => item.id === id);

    if (!item) {
      return NextResponse.json(
        { error: 'Item not found' },
        { status: 404 }
      );
    }

    // Delete all related transactions first (to satisfy foreign key constraint)
    const transactions = await readTransactions();
    const relatedTransactions = transactions.filter(t => t.inventory_id === id);
    
    for (const transaction of relatedTransactions) {
      await deleteTransaction(transaction.id);
    }

    // Now delete the inventory item
    await deleteInventoryItem(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting item:', error);
    return NextResponse.json(
      { error: 'Failed to delete item' },
      { status: 500 }
    );
  }
}

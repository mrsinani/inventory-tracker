import { NextRequest, NextResponse } from 'next/server';
import { readInventory, writeInventory } from '@/lib/csv';
import { InventoryItem } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';

// GET /api/inventory - Get all inventory items
export async function GET() {
  try {
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

    const items = await readInventory();
    items.push(newItem);
    await writeInventory(items);

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
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Item ID is required' },
        { status: 400 }
      );
    }

    const items = await readInventory();
    const itemIndex = items.findIndex(item => item.id === id);

    if (itemIndex === -1) {
      return NextResponse.json(
        { error: 'Item not found' },
        { status: 404 }
      );
    }

    // Update item (preserve stock_on_hand unless explicitly updating)
    items[itemIndex] = {
      ...items[itemIndex],
      ...updates,
      id // Ensure ID doesn't change
    };

    await writeInventory(items);

    return NextResponse.json(items[itemIndex]);
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
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Item ID is required' },
        { status: 400 }
      );
    }

    const items = await readInventory();
    const filteredItems = items.filter(item => item.id !== id);

    if (filteredItems.length === items.length) {
      return NextResponse.json(
        { error: 'Item not found' },
        { status: 404 }
      );
    }

    await writeInventory(filteredItems);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting item:', error);
    return NextResponse.json(
      { error: 'Failed to delete item' },
      { status: 500 }
    );
  }
}

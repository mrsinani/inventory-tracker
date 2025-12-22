import { NextRequest, NextResponse } from "next/server";
import { getInventoryItem, appendTransaction, initDatabase } from "@/lib/db";
import { Transaction } from "@/lib/types";
import { v4 as uuidv4 } from "uuid";

// POST /api/orders - Create a pending order
export async function POST(request: NextRequest) {
  try {
    await initDatabase();
    const body = await request.json();
    const { inventory_id, ordered_quantity, notes, employee_name } = body;

    console.log(
      "[API/orders] POST",
      "inventory_id=",
      inventory_id,
      "qty=",
      ordered_quantity
    );

    if (!inventory_id || !ordered_quantity) {
      return NextResponse.json(
        { error: "Missing required fields: inventory_id, ordered_quantity" },
        { status: 400 }
      );
    }

    const orderedQty = parseFloat(ordered_quantity);

    if (isNaN(orderedQty) || orderedQty <= 0) {
      return NextResponse.json(
        { error: "Ordered quantity must be a positive number" },
        { status: 400 }
      );
    }

    // Verify item exists (direct query - much faster)
    const item = await getInventoryItem(inventory_id);

    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    const currentStock = parseFloat(item.stock_on_hand) || 0;

    // Create pending transaction
    const transaction: Transaction = {
      id: uuidv4(),
      inventory_id,
      timestamp: new Date().toISOString(),
      ordered_quantity: orderedQty.toString(),
      actual_received: "0",
      previous_stock: currentStock.toString(),
      new_stock: currentStock.toString(),
      consumption: "0", // Required for compatibility
      status: "pending",
      notes: notes || "",
      employee_name: employee_name || "",
    };

    await appendTransaction(transaction);

    return NextResponse.json(transaction, { status: 201 });
  } catch (error) {
    console.error("[API/orders] Error creating order:", error);
    return NextResponse.json(
      { error: "Failed to create order" },
      { status: 500 }
    );
  }
}

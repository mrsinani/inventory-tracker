import { NextRequest, NextResponse } from "next/server";
import {
  readInventory,
  writeInventory,
  appendTransaction,
  readTransactions,
  writeTransactions,
} from "@/lib/csv";
import { Transaction } from "@/lib/types";
import { v4 as uuidv4 } from "uuid";

// PATCH /api/inventory/[id]/stock - Receive stock (simplified)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { actual_received, notes, pending_order_id } = body;

    // Validation
    if (actual_received === undefined) {
      return NextResponse.json(
        { error: "Missing required field: actual_received" },
        { status: 400 }
      );
    }

    const receivedQty = parseFloat(actual_received);

    if (isNaN(receivedQty)) {
      return NextResponse.json(
        { error: "Quantity must be a valid number" },
        { status: 400 }
      );
    }

    if (receivedQty < 0) {
      return NextResponse.json(
        { error: "Quantity cannot be negative" },
        { status: 400 }
      );
    }

    // Read current inventory
    const items = await readInventory();
    const itemIndex = items.findIndex((item) => item.id === params.id);

    if (itemIndex === -1) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    const item = items[itemIndex];
    const previousStock = parseFloat(item.stock_on_hand) || 0;

    // Simple calculation: new stock = current + received
    const newStockQty = previousStock + receivedQty;

    // Update stock_on_hand
    items[itemIndex] = {
      ...item,
      stock_on_hand: newStockQty.toString(),
    };

    await writeInventory(items);

    // If completing a pending order, update it instead of creating new
    if (pending_order_id) {
      // Read transactions and update the pending one
      const transactions = await readTransactions();
      const pendingIndex = transactions.findIndex(
        (t) => t.id === pending_order_id
      );

      if (pendingIndex !== -1) {
        const orderedQty =
          parseFloat(transactions[pendingIndex].ordered_quantity) || 0;

        transactions[pendingIndex] = {
          ...transactions[pendingIndex],
          actual_received: receivedQty.toString(),
          previous_stock: previousStock.toString(),
          new_stock: newStockQty.toString(),
          consumption: transactions[pendingIndex].consumption || "0", // Preserve existing or default to 0
          status: "completed",
          notes: notes || transactions[pendingIndex].notes || "",
        };

        // Write updated transactions back to blob
        await writeTransactions(transactions);

        return NextResponse.json({
          item: items[itemIndex],
          transaction: transactions[pendingIndex],
        });
      }
    }

    // Create new transaction record (no pending order selected)
    const transaction: Transaction = {
      id: uuidv4(),
      inventory_id: params.id,
      timestamp: new Date().toISOString(),
      ordered_quantity: receivedQty.toString(), // Use received as ordered since no pending order
      actual_received: receivedQty.toString(),
      previous_stock: previousStock.toString(),
      new_stock: newStockQty.toString(),
      consumption: "0", // Required for CSV format compatibility
      status: "completed",
      notes: notes || "",
    };

    await appendTransaction(transaction);

    return NextResponse.json({
      item: items[itemIndex],
      transaction,
    });
  } catch (error) {
    console.error("Error updating stock:", error);
    return NextResponse.json(
      { error: "Failed to update stock" },
      { status: 500 }
    );
  }
}

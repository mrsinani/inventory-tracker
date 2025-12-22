import { NextRequest, NextResponse } from "next/server";
import {
  getInventoryItem,
  updateInventoryItem,
  appendTransaction,
  getTransaction,
  updateTransaction,
  initDatabase,
} from "@/lib/db";
import { Transaction } from "@/lib/types";
import { v4 as uuidv4 } from "uuid";

// PATCH /api/inventory/[id]/stock - Receive stock (simplified)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await initDatabase();
    const body = await request.json();
    const { actual_received, new_stock, notes, pending_order_id, employee_name } =
      body;

    // Validation: require either actual_received (receive) or new_stock (direct set)
    if (actual_received === undefined && new_stock === undefined) {
      return NextResponse.json(
        { error: "Missing required field: actual_received or new_stock" },
        { status: 400 }
      );
    }

    // Read current inventory (direct query - much faster)
    const item = await getInventoryItem(params.id);

    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }
    const previousStock = parseFloat(item.stock_on_hand) || 0;
    const isDirectUpdate = new_stock !== undefined;

    let receivedQty = 0;
    let newStockQty = previousStock;

    if (isDirectUpdate) {
      const targetStock = parseFloat(new_stock);
      if (isNaN(targetStock) || targetStock < 0) {
        return NextResponse.json(
          { error: "New stock must be a valid non-negative number" },
          { status: 400 }
        );
      }
      newStockQty = targetStock;
      const delta = targetStock - previousStock;
      // For history purposes, record the full adjustment (can be negative)
      receivedQty = delta;
    } else {
      receivedQty = parseFloat(actual_received);

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

      // Simple calculation: new stock = current + received
      newStockQty = previousStock + receivedQty;
    }

    // Update stock_on_hand using optimized single-item update
    const updatedItem = {
      ...item,
      stock_on_hand: newStockQty.toString(),
    };

    await updateInventoryItem(updatedItem);

    // If completing a pending order, update it instead of creating new.
    // Only applies to "receive" mode; direct updates are separate adjustments.
    if (!isDirectUpdate && pending_order_id) {
      // Get transaction directly (much faster than fetching all)
      const pendingTransaction = await getTransaction(pending_order_id);

      if (pendingTransaction) {
        const orderedQty = parseFloat(pendingTransaction.ordered_quantity) || 0;

        const updatedTransaction: Transaction = {
          ...pendingTransaction,
          actual_received: receivedQty.toString(),
          previous_stock: previousStock.toString(),
          new_stock: newStockQty.toString(),
          consumption: pendingTransaction.consumption || "0", // Preserve existing or default to 0
          status: "completed" as const,
          notes: notes || pendingTransaction.notes || "",
          employee_name: employee_name || pendingTransaction.employee_name || "",
        };

        // Update transaction using optimized single-item update
        await updateTransaction(updatedTransaction);

        return NextResponse.json({
          item: updatedItem,
          transaction: updatedTransaction,
        });
      }
    }

    // Create new transaction record (no pending order selected)
    const transaction: Transaction = {
      id: uuidv4(),
      inventory_id: params.id,
      timestamp: new Date().toISOString(),
      ordered_quantity: receivedQty.toString(),
      actual_received: receivedQty.toString(),
      previous_stock: previousStock.toString(),
      new_stock: newStockQty.toString(),
      consumption: "0", // Required for CSV format compatibility
      status: "completed",
      notes: notes || "",
      employee_name: employee_name || "",
    };

    await appendTransaction(transaction);

    return NextResponse.json({
      item: updatedItem,
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

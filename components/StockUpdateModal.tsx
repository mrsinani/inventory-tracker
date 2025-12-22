"use client";

import { useState, useEffect } from "react";
import { InventoryItem, Transaction } from "@/lib/types";

interface StockUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: InventoryItem;
  onSuccess: () => void;
  mode?: "receive" | "update";
}

export default function StockUpdateModal({
  isOpen,
  onClose,
  item,
  onSuccess,
  mode = "receive",
}: StockUpdateModalProps) {
  const isUpdateMode = mode === "update";
  const [quantity, setQuantity] = useState("");
  const [notes, setNotes] = useState("");
  const [employeeName, setEmployeeName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [pendingOrders, setPendingOrders] = useState<Transaction[]>([]);
  const [selectedPendingOrder, setSelectedPendingOrder] = useState<string>("");

  const fetchPendingOrders = async () => {
    try {
      const response = await fetch(`/api/transactions?inventory_id=${item.id}`);
      if (response.ok) {
        const transactions: Transaction[] = await response.json();
        const pending = transactions.filter(
          (t: Transaction) => t.status === "pending"
        );
        setPendingOrders(pending);
      }
    } catch (error) {
      console.error("Error fetching pending orders:", error);
    }
  };

  useEffect(() => {
    if (isOpen && item?.id) {
      fetchPendingOrders();
    }
  }, [isOpen, item?.id]);

  const handleSelectPendingOrder = (orderId: string) => {
    setSelectedPendingOrder(orderId);
    const order = pendingOrders.find((o) => o.id === orderId);
    if (order) {
      // Pre-fill received with ordered quantity (user can adjust if needed)
      setQuantity(order.ordered_quantity);
      setNotes(order.notes || "");
    }
  };

  // Calculate the new stock that will result
  const currentStock = parseFloat(item.stock_on_hand) || 0;
  const parsedQty = parseFloat(quantity) || 0;
  const newStockPreview = isUpdateMode ? parsedQty : currentStock + parsedQty;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const parsed = parseFloat(quantity);

    if (isNaN(parsed)) {
      setError("Please enter a valid quantity");
      return;
    }

    if (!isUpdateMode && parsed < 0) {
      setError("Quantity cannot be negative");
      return;
    }

    if (isUpdateMode && parsed < 0) {
      setError("New stock cannot be negative");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/inventory/${item.id}/stock`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actual_received: !isUpdateMode ? parsed : undefined,
          new_stock: isUpdateMode ? parsed : undefined,
          notes,
          pending_order_id: !isUpdateMode
            ? selectedPendingOrder || undefined
            : undefined,
          employee_name: employeeName || undefined,
        }),
      });

      if (response.ok) {
        onSuccess();
        resetForm();
      } else {
        const data = await response.json();
        setError(data.error || "Failed to update stock");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setQuantity("");
    setNotes("");
    setEmployeeName("");
    setError("");
    setSelectedPendingOrder("");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {isUpdateMode ? "Update Stock" : "Receive Stock"}
          </h2>
          <p className="text-sm text-gray-600 mt-1">{item.item}</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="bg-gray-50 p-3 rounded">
            <p className="text-sm text-gray-600">
              Current Stock:{" "}
              <span className="font-medium text-gray-900">
                {item.stock_on_hand} {item.units}
              </span>
            </p>
          </div>

          {!isUpdateMode && pendingOrders.length > 0 ? (
            <div className="bg-yellow-50 border-2 border-yellow-300 p-4 rounded-lg">
              <p className="text-sm font-semibold text-yellow-900 mb-3">
                📦 {pendingOrders.length} Pending Order
                {pendingOrders.length > 1 ? "s" : ""} to Fulfill
              </p>
              <select
                value={selectedPendingOrder}
                onChange={(e) => handleSelectPendingOrder(e.target.value)}
                className="w-full px-3 py-2 border-2 border-yellow-400 rounded-md focus:ring-2 focus:ring-yellow-500 bg-white text-sm font-medium"
              >
                <option value="">
                  -- Select a pending order to fulfill --
                </option>
                {pendingOrders.map((order) => (
                  <option key={order.id} value={order.id}>
                    {parseFloat(order.ordered_quantity).toFixed(0)} {item.units}{" "}
                    ordered on {new Date(order.timestamp).toLocaleDateString()}
                    {order.notes && ` (${order.notes})`}
                  </option>
                ))}
              </select>
              {selectedPendingOrder && (
                <p className="text-xs text-yellow-700 mt-2">
                  ✓ Order selected - quantity pre-filled below
                </p>
              )}
            </div>
          ) : !isUpdateMode ? (
            <div className="bg-gray-50 border border-gray-200 p-3 rounded text-sm text-gray-600">
              No pending orders for this item. You can still record a stock
              receipt.
            </div>
          ) : null}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div>
            <label
              htmlFor="quantity"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              {isUpdateMode ? "New Stock Level *" : "Quantity Received *"}
            </label>
            <input
              type="number"
              id="quantity"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              step="0.01"
              min="0"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder={
                isUpdateMode
                  ? "Enter new stock level"
                  : "Enter quantity received"
              }
            />
          </div>

          {quantity && (
            <div className="bg-green-50 border border-green-200 p-3 rounded">
              <p className="text-sm font-medium text-green-900">
                New Stock:{" "}
                <span className="text-lg">{newStockPreview.toFixed(2)}</span>{" "}
                {item.units}
              </p>
              <p className="text-xs text-green-700 mt-1">
                {isUpdateMode
                  ? `(${item.stock_on_hand} → ${newStockPreview.toFixed(2)})`
                  : `(${
                      item.stock_on_hand
                    } + ${quantity} = ${newStockPreview.toFixed(2)})`}
              </p>
            </div>
          )}

          <div>
            <label
              htmlFor="employee"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Employee Name
            </label>
            <input
              id="employee"
              type="text"
              value={employeeName}
              onChange={(e) => setEmployeeName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="Who performed this update/receipt?"
            />
          </div>

          <div>
            <label
              htmlFor="notes"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Notes (optional)
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="PO number, delivery info, etc."
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => {
                onClose();
                resetForm();
              }}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !quantity}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting
                ? isUpdateMode
                  ? "Updating..."
                  : "Receiving..."
                : isUpdateMode
                ? "Update Stock"
                : "Receive Stock"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { InventoryItem } from "@/lib/types";

interface PlaceOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: InventoryItem;
  onSuccess: () => void;
}

export default function PlaceOrderModal({
  isOpen,
  onClose,
  item,
  onSuccess,
}: PlaceOrderModalProps) {
  const [orderedQuantity, setOrderedQuantity] = useState("");
  const [notes, setNotes] = useState("");
  const [employeeName, setEmployeeName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const orderedQty = parseFloat(orderedQuantity);

    if (isNaN(orderedQty) || orderedQty <= 0) {
      setError("Ordered quantity must be a positive number");
      return;
    }

    setIsSubmitting(true);

    try {
      // Create a pending order transaction
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inventory_id: item.id,
          ordered_quantity: orderedQty,
          notes,
          employee_name: employeeName || undefined,
        }),
      });

      if (response.ok) {
        onSuccess();
        resetForm();
      } else {
        const data = await response.json();
        setError(data.error || "Failed to place order");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setOrderedQuantity("");
    setNotes("");
    setEmployeeName("");
    setError("");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Place Order</h2>
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
            <p className="text-sm text-gray-600">
              Reorder Level:{" "}
              <span className="font-medium text-gray-900">
                {item.stock_up} {item.units}
              </span>
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div>
            <label
              htmlFor="ordered"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Quantity to Order *
            </label>
            <input
              type="number"
              id="ordered"
              value={orderedQuantity}
              onChange={(e) => setOrderedQuantity(e.target.value)}
              step="0.01"
              min="0.01"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="Enter quantity"
            />
          </div>

          <div>
            <label
              htmlFor="employee"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Employee Name
            </label>
            <input
              type="text"
              id="employee"
              value={employeeName}
              onChange={(e) => setEmployeeName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="Who placed this order?"
            />
          </div>

          <div>
            <label
              htmlFor="notes"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Order Notes
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="PO number, vendor contact, expected delivery date..."
            />
          </div>

          <div className="bg-yellow-50 border border-yellow-200 p-3 rounded">
            <p className="text-sm text-yellow-800">
              This will record the order as pending. You can mark it as received
              later when it arrives.
            </p>
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
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Placing Order..." : "Place Order"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

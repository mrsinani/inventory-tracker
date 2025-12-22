"use client";

import { useEffect, useState } from "react";
import { InventoryItem, Transaction } from "@/lib/types";

interface TransactionHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: InventoryItem;
  onTransactionDeleted?: () => void;
}

export default function TransactionHistoryModal({
  isOpen,
  onClose,
  item,
  onTransactionDeleted,
}: TransactionHistoryModalProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && item) {
      fetchTransactions();
    }
  }, [isOpen, item]);

  const fetchTransactions = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/transactions?inventory_id=${item.id}`);
      if (response.ok) {
        const data = await response.json();
        setTransactions(data);
      }
    } catch (error) {
      console.error("Error fetching transactions:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleDeleteTransaction = async (transactionId: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this transaction? This will revert the stock change."
      )
    ) {
      return;
    }

    setDeletingId(transactionId);
    try {
      const response = await fetch(`/api/transactions/${transactionId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        // Refresh transactions list
        await fetchTransactions();
        // Notify parent to refresh inventory
        if (onTransactionDeleted) {
          onTransactionDeleted();
        }
      } else {
        const data = await response.json();
        alert(data.error || "Failed to delete transaction");
      }
    } catch (error) {
      console.error("Error deleting transaction:", error);
      alert("Network error. Please try again.");
    } finally {
      setDeletingId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            Transaction History
          </h2>
          <p className="text-sm text-gray-600 mt-1">{item.item}</p>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">Loading...</div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No transaction history for this item yet.
            </div>
          ) : (
            <div className="space-y-4">
              {transactions.map((transaction, index) => (
                <div
                  key={transaction.id}
                  className={`border rounded-lg p-4 ${
                    transaction.status === "pending"
                      ? "bg-yellow-50 border-yellow-200"
                      : "bg-white border-gray-200"
                  }`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900">
                          {formatDate(transaction.timestamp)}
                        </span>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            transaction.status === "pending"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-green-100 text-green-800"
                          }`}
                        >
                          {transaction.status === "pending"
                            ? "PENDING"
                            : "COMPLETED"}
                        </span>
                        {index === 0 && (
                          <span className="text-xs text-gray-500">
                            (Latest)
                          </span>
                        )}
                      </div>
                    </div>
                    {transaction.notes?.includes("Imported from Excel") ? (
                      <span className="text-xs text-gray-400 italic">
                        Imported
                      </span>
                    ) : (
                      <button
                        onClick={() => handleDeleteTransaction(transaction.id)}
                        disabled={deletingId === transaction.id}
                        className="px-3 py-1 bg-red-100 text-red-700 hover:bg-red-200 rounded text-sm font-medium disabled:opacity-50 transition-colors"
                        title="Delete and revert stock change"
                      >
                        {deletingId === transaction.id
                          ? "Deleting..."
                          : "🗑️ Undo"}
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Ordered:</span>
                      <span className="ml-2 font-medium text-gray-900">
                        {parseFloat(transaction.ordered_quantity).toFixed(2)}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Received:</span>
                      <span className="ml-2 font-medium text-gray-900">
                        {parseFloat(transaction.actual_received).toFixed(2)}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">New Stock:</span>
                      <span className="ml-2 font-medium text-gray-900">
                        {parseFloat(transaction.new_stock).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {(transaction.notes || transaction.employee_name) && (
                    <div className="mt-3 pt-3 border-t border-gray-200 space-y-1">
                      {transaction.employee_name && (
                        <p className="text-xs text-gray-600">
                          <span className="font-medium">Employee:</span>{" "}
                          {transaction.employee_name}
                        </p>
                      )}
                      {transaction.notes && (
                        <div>
                          <span className="text-xs text-gray-500">Notes:</span>
                          <p className="text-sm text-gray-700 mt-1">
                            {transaction.notes}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

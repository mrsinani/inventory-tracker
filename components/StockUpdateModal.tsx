'use client';

import { useState, useMemo, useEffect } from 'react';
import { InventoryItem, Transaction } from '@/lib/types';

interface StockUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: InventoryItem;
  onSuccess: () => void;
}

export default function StockUpdateModal({ isOpen, onClose, item, onSuccess }: StockUpdateModalProps) {
  const [orderedQuantity, setOrderedQuantity] = useState('');
  const [actualReceived, setActualReceived] = useState('');
  const [newStock, setNewStock] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [pendingOrders, setPendingOrders] = useState<Transaction[]>([]);
  const [selectedPendingOrder, setSelectedPendingOrder] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      fetchPendingOrders();
    }
  }, [isOpen, item.id]);

  const fetchPendingOrders = async () => {
    try {
      const response = await fetch(`/api/transactions?inventory_id=${item.id}`);
      if (response.ok) {
        const transactions = await response.json();
        const pending = transactions.filter((t: Transaction) => t.status === 'pending');
        setPendingOrders(pending);
      }
    } catch (error) {
      console.error('Error fetching pending orders:', error);
    }
  };

  const handleSelectPendingOrder = (orderId: string) => {
    setSelectedPendingOrder(orderId);
    const order = pendingOrders.find(o => o.id === orderId);
    if (order) {
      setOrderedQuantity(order.ordered_quantity);
      setNotes(order.notes || '');
    }
  };

  const consumption = useMemo(() => {
    const previousStock = parseFloat(item.stock_on_hand) || 0;
    const received = parseFloat(actualReceived) || 0;
    const newStockValue = parseFloat(newStock) || 0;

    if (actualReceived && newStock) {
      return previousStock + received - newStockValue;
    }
    return null;
  }, [item.stock_on_hand, actualReceived, newStock]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const orderedQty = parseFloat(orderedQuantity);
    const receivedQty = parseFloat(actualReceived);
    const newStockQty = parseFloat(newStock);

    if (isNaN(orderedQty) || isNaN(receivedQty) || isNaN(newStockQty)) {
      setError('All quantities must be valid numbers');
      return;
    }

    if (orderedQty < 0 || receivedQty < 0 || newStockQty < 0) {
      setError('Quantities cannot be negative');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/inventory/${item.id}/stock`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ordered_quantity: orderedQty,
          actual_received: receivedQty,
          new_stock: newStockQty,
          notes,
          pending_order_id: selectedPendingOrder || undefined
        })
      });

      if (response.ok) {
        onSuccess();
        resetForm();
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to update stock');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setOrderedQuantity('');
    setActualReceived('');
    setNewStock('');
    setNotes('');
    setError('');
    setSelectedPendingOrder('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Update Stock</h2>
          <p className="text-sm text-gray-600 mt-1">{item.item}</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="bg-gray-50 p-3 rounded">
            <p className="text-sm text-gray-600">
              Current Stock: <span className="font-medium text-gray-900">{item.stock_on_hand} {item.units}</span>
            </p>
          </div>

          {pendingOrders.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 p-3 rounded">
              <p className="text-sm font-medium text-yellow-900 mb-2">
                Pending Orders ({pendingOrders.length})
              </p>
              <select
                value={selectedPendingOrder}
                onChange={(e) => handleSelectPendingOrder(e.target.value)}
                className="w-full px-3 py-2 border border-yellow-300 rounded-md focus:ring-2 focus:ring-yellow-500 bg-white text-sm"
              >
                <option value="">Select a pending order to fulfill...</option>
                {pendingOrders.map((order) => (
                  <option key={order.id} value={order.id}>
                    Ordered {parseFloat(order.ordered_quantity).toFixed(2)} {item.units} on{' '}
                    {new Date(order.timestamp).toLocaleDateString()}
                    {order.notes && ` - ${order.notes}`}
                  </option>
                ))}
              </select>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="ordered" className="block text-sm font-medium text-gray-700 mb-1">
              Ordered Quantity
            </label>
            <input
              type="number"
              id="ordered"
              value={orderedQuantity}
              onChange={(e) => setOrderedQuantity(e.target.value)}
              step="0.01"
              min="0"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          <div>
            <label htmlFor="received" className="block text-sm font-medium text-gray-700 mb-1">
              Actual Received Quantity
            </label>
            <input
              type="number"
              id="received"
              value={actualReceived}
              onChange={(e) => setActualReceived(e.target.value)}
              step="0.01"
              min="0"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          <div>
            <label htmlFor="newStock" className="block text-sm font-medium text-gray-700 mb-1">
              New Stock on Hand
            </label>
            <input
              type="number"
              id="newStock"
              value={newStock}
              onChange={(e) => setNewStock(e.target.value)}
              step="0.01"
              min="0"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          {consumption !== null && (
            <div className="bg-blue-50 border border-blue-200 p-3 rounded">
              <p className="text-sm font-medium text-blue-900">
                Calculated Consumption: <span className="text-lg">{consumption.toFixed(2)}</span> {item.units}
              </p>
              <p className="text-xs text-blue-700 mt-1">
                ({item.stock_on_hand} + {actualReceived} - {newStock})
              </p>
            </div>
          )}

          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
              Notes (optional)
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
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
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Updating...' : 'Update Stock'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

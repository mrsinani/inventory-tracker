'use client';

import { useState, useMemo, useEffect } from 'react';
import { InventoryItem, Transaction } from '@/lib/types';
import LowStockBadge from './LowStockBadge';
import PendingOrderBadge from './PendingOrderBadge';
import StockUpdateModal from './StockUpdateModal';
import ItemFormModal from './ItemFormModal';
import DeleteConfirmModal from './DeleteConfirmModal';
import SearchFilter from './SearchFilter';
import PlaceOrderModal from './PlaceOrderModal';
import TransactionHistoryModal from './TransactionHistoryModal';

interface InventoryTableProps {
  initialItems: InventoryItem[];
}

export default function InventoryTable({ initialItems }: InventoryTableProps) {
  const [items, setItems] = useState<InventoryItem[]>(initialItems);
  const [pendingOrdersByItem, setPendingOrdersByItem] = useState<Map<string, Transaction[]>>(new Map());
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [roomFilter, setRoomFilter] = useState('');
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);

  const [stockUpdateModal, setStockUpdateModal] = useState<{ isOpen: boolean; item: InventoryItem | null }>({
    isOpen: false,
    item: null
  });
  const [itemFormModal, setItemFormModal] = useState<{ isOpen: boolean; item: InventoryItem | null }>({
    isOpen: false,
    item: null
  });
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; item: InventoryItem | null }>({
    isOpen: false,
    item: null
  });
  const [placeOrderModal, setPlaceOrderModal] = useState<{ isOpen: boolean; item: InventoryItem | null }>({
    isOpen: false,
    item: null
  });
  const [historyModal, setHistoryModal] = useState<{ isOpen: boolean; item: InventoryItem | null }>({
    isOpen: false,
    item: null
  });

  const uniqueDepartments = useMemo(() => {
    const departments = new Set(items.map(item => item.department).filter(Boolean));
    return Array.from(departments).sort();
  }, [items]);

  const uniqueRooms = useMemo(() => {
    const rooms = new Set(items.map(item => item.room).filter(Boolean));
    return Array.from(rooms).sort();
  }, [items]);

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesSearch = !searchTerm ||
        item.item.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.vendor.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.department.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesDepartment = !departmentFilter || item.department === departmentFilter;
      const matchesRoom = !roomFilter || item.room === roomFilter;

      const matchesLowStock = !showLowStockOnly ||
        (parseFloat(item.stock_on_hand) || 0) < (parseFloat(item.stock_up) || 0);

      return matchesSearch && matchesDepartment && matchesRoom && matchesLowStock;
    });
  }, [items, searchTerm, departmentFilter, roomFilter, showLowStockOnly]);

  useEffect(() => {
    fetchPendingOrders();
  }, [items]);

  const fetchPendingOrders = async () => {
    try {
      const response = await fetch('/api/transactions');
      if (response.ok) {
        const allTransactions = await response.json();
        const pendingMap = new Map<string, Transaction[]>();

        allTransactions.forEach((t: Transaction) => {
          if (t.status === 'pending') {
            const existing = pendingMap.get(t.inventory_id) || [];
            existing.push(t);
            pendingMap.set(t.inventory_id, existing);
          }
        });

        setPendingOrdersByItem(pendingMap);
      }
    } catch (error) {
      console.error('Error fetching pending orders:', error);
    }
  };

  const refreshItems = async () => {
    const response = await fetch('/api/inventory');
    if (response.ok) {
      const data = await response.json();
      setItems(data);
      await fetchPendingOrders();
    }
  };

  const getRowColorClass = (item: InventoryItem) => {
    const stockOnHand = parseFloat(item.stock_on_hand) || 0;
    const stockUp = parseFloat(item.stock_up) || 0;
    const isLowStock = stockOnHand < stockUp;

    if (!isLowStock) {
      return '';
    }

    // Check if there are pending orders
    const pendingOrders = pendingOrdersByItem.get(item.id) || [];
    if (pendingOrders.length > 0) {
      // Calculate total pending quantity
      const totalPending = pendingOrders.reduce((sum, order) => {
        return sum + (parseFloat(order.ordered_quantity) || 0);
      }, 0);

      // If pending orders would bring stock above reorder level, show yellow
      if (stockOnHand + totalPending >= stockUp) {
        return 'bg-yellow-50';
      }
    }

    // Low stock with no orders or insufficient orders - show red
    return 'bg-red-50';
  };

  const handleStockUpdate = async () => {
    await refreshItems();
    setStockUpdateModal({ isOpen: false, item: null });
  };

  const handlePlaceOrder = async () => {
    await refreshItems();
    setPlaceOrderModal({ isOpen: false, item: null });
  };

  const handleItemSave = async () => {
    await refreshItems();
    setItemFormModal({ isOpen: false, item: null });
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/inventory?id=${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await refreshItems();
        setDeleteModal({ isOpen: false, item: null });
      }
    } catch (error) {
      console.error('Error deleting item:', error);
    }
  };

  return (
    <div className="space-y-4">
      <SearchFilter
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        departmentFilter={departmentFilter}
        onDepartmentChange={setDepartmentFilter}
        roomFilter={roomFilter}
        onRoomChange={setRoomFilter}
        showLowStockOnly={showLowStockOnly}
        onLowStockToggle={setShowLowStockOnly}
        departments={uniqueDepartments}
        rooms={uniqueRooms}
        onAddItem={() => setItemFormModal({ isOpen: true, item: null })}
      />

      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Item
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Room
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stock Up
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stock On Hand
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Units
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredItems.map((item) => (
                <tr
                  key={item.id}
                  className={getRowColorClass(item)}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-medium text-gray-900">{item.item}</div>
                      <LowStockBadge stockOnHand={item.stock_on_hand} stockUp={item.stock_up} />
                      <PendingOrderBadge inventoryId={item.id} />
                    </div>
                    <div className="text-sm text-gray-500">{item.vendor}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {item.room}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {item.stock_up}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {item.stock_on_hand}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {item.units}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex flex-col gap-1">
                      <div className="space-x-2">
                        <button
                          onClick={() => setPlaceOrderModal({ isOpen: true, item })}
                          className="text-yellow-600 hover:text-yellow-900"
                        >
                          Place Order
                        </button>
                        <button
                          onClick={() => setStockUpdateModal({ isOpen: true, item })}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          Receive
                        </button>
                        <button
                          onClick={() => setHistoryModal({ isOpen: true, item })}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          History
                        </button>
                      </div>
                      <div className="space-x-2">
                        <button
                          onClick={() => setItemFormModal({ isOpen: true, item })}
                          className="text-gray-600 hover:text-gray-900"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setDeleteModal({ isOpen: true, item })}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredItems.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              No items found matching your filters
            </div>
          )}
        </div>

        <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
          <p className="text-sm text-gray-700">
            Showing <span className="font-medium">{filteredItems.length}</span> of{' '}
            <span className="font-medium">{items.length}</span> items
          </p>
        </div>
      </div>

      {stockUpdateModal.item && (
        <StockUpdateModal
          isOpen={stockUpdateModal.isOpen}
          onClose={() => setStockUpdateModal({ isOpen: false, item: null })}
          item={stockUpdateModal.item}
          onSuccess={handleStockUpdate}
        />
      )}

      <ItemFormModal
        isOpen={itemFormModal.isOpen}
        onClose={() => setItemFormModal({ isOpen: false, item: null })}
        item={itemFormModal.item}
        onSuccess={handleItemSave}
      />

      {deleteModal.item && (
        <DeleteConfirmModal
          isOpen={deleteModal.isOpen}
          onClose={() => setDeleteModal({ isOpen: false, item: null })}
          itemName={deleteModal.item.item}
          onConfirm={() => handleDelete(deleteModal.item!.id)}
        />
      )}

      {placeOrderModal.item && (
        <PlaceOrderModal
          isOpen={placeOrderModal.isOpen}
          onClose={() => setPlaceOrderModal({ isOpen: false, item: null })}
          item={placeOrderModal.item}
          onSuccess={handlePlaceOrder}
        />
      )}

      {historyModal.item && (
        <TransactionHistoryModal
          isOpen={historyModal.isOpen}
          onClose={() => setHistoryModal({ isOpen: false, item: null })}
          item={historyModal.item}
          onTransactionDeleted={refreshItems}
        />
      )}
    </div>
  );
}

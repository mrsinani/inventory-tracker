'use client';

import { Transaction } from '@/lib/types';

interface PendingOrderBadgeProps {
  inventoryId: string;
  pendingOrders?: Transaction[];
}

export default function PendingOrderBadge({ inventoryId, pendingOrders }: PendingOrderBadgeProps) {
  // Filter pending orders for this specific inventory item
  const itemPendingOrders = pendingOrders?.filter(
    (t) => t.inventory_id === inventoryId && t.status === 'pending'
  ) || [];
  
  const pendingCount = itemPendingOrders.length;

  if (pendingCount === 0) {
    return null;
  }

  // Calculate total pending quantity
  const totalQuantity = itemPendingOrders.reduce(
    (sum, order) => sum + (parseFloat(order.ordered_quantity) || 0),
    0
  );

  return (
    <span 
      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800"
      title={`${totalQuantity.toFixed(0)} units on order`}
    >
      {pendingCount} ORDER{pendingCount > 1 ? 'S' : ''} PENDING
    </span>
  );
}

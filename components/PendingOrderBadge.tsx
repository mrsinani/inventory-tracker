'use client';

import { useEffect, useState } from 'react';

interface PendingOrderBadgeProps {
  inventoryId: string;
}

export default function PendingOrderBadge({ inventoryId }: PendingOrderBadgeProps) {
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    fetchPendingOrders();
  }, [inventoryId]);

  const fetchPendingOrders = async () => {
    try {
      const response = await fetch(`/api/transactions?inventory_id=${inventoryId}`);
      if (response.ok) {
        const transactions = await response.json();
        const pending = transactions.filter((t: any) => t.status === 'pending');
        setPendingCount(pending.length);
      }
    } catch (error) {
      console.error('Error fetching pending orders:', error);
    }
  };

  if (pendingCount === 0) {
    return null;
  }

  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
      {pendingCount} ORDER{pendingCount > 1 ? 'S' : ''} PENDING
    </span>
  );
}

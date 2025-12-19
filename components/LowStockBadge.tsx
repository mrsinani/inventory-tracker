interface LowStockBadgeProps {
  stockOnHand: string;
  stockUp: string;
}

export default function LowStockBadge({ stockOnHand, stockUp }: LowStockBadgeProps) {
  const currentStock = parseFloat(stockOnHand) || 0;
  const reorderLevel = parseFloat(stockUp) || 0;
  const isLow = currentStock < reorderLevel;

  if (!isLow) {
    return null;
  }

  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
      LOW
    </span>
  );
}

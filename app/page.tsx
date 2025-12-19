import { readInventory, initDatabase } from '@/lib/db';
import InventoryTable from '@/components/InventoryTable';

export const dynamic = 'force-dynamic';

export default async function Home() {
  await initDatabase();
  const items = await readInventory();

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Inventory Tracker</h1>
          <p className="mt-2 text-sm text-gray-600">
            Manage your inventory and track stock levels
          </p>
        </div>

        <InventoryTable initialItems={items} />
      </div>
    </main>
  );
}

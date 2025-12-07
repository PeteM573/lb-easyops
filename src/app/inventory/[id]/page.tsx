// src/app/inventory/[id]/page.tsx
import { supabase } from '@/lib/supabaseClient';
import { ArrowLeft, Package } from 'lucide-react';
import Link from 'next/link';
import { formatQuantityWithUnit } from '@/lib/pluralize-unit';

interface PageProps {
  // The shape of params is now a Promise that resolves to an object
  params: Promise<{ id: string }>;
}

export default async function ItemDetailPage({ params }: PageProps) {
  // THE CRUCIAL FIX: Await the params promise to get the actual object.
  const resolvedParams = await params;
  const id = parseInt(resolvedParams.id, 10);

  if (isNaN(id)) {
    return (
      <div className="min-h-screen bg-gray-50 p-8 flex flex-col items-center justify-center">
        <h1 className="text-4xl font-bold text-gray-800 mb-4">Invalid ID</h1>
        <p className="text-lg text-gray-500 mb-8">The item ID must be a number.</p>
        <Link href="/" className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg">
          Back to Dashboard
        </Link>
      </div>
    );
  }

  const { data: item, error } = await supabase
    .from('items')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !item) {
    return (
      <div className="min-h-screen bg-gray-50 p-8 flex flex-col items-center justify-center">
        <h1 className="text-4xl font-bold text-gray-800 mb-4">Item Not Found</h1>
        <p className="text-lg text-gray-500 mb-8">Sorry, we couldn't find an item with that ID.</p>
        <Link href="/" className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg">
          Back to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <header className="mb-10">
        <Link href="/" className="text-blue-500 hover:underline mb-4 block">&larr; Back to Dashboard</Link>
        <h1 className="text-4xl font-bold text-gray-800">{item.name}</h1>
        <p className="text-lg text-gray-500">Category: {item.category}</p>
      </header>

      <main>
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-8 max-w-2xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Storage Location */}
            <div className="p-4 bg-gray-100 rounded-lg">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Location</h2>
              <p className="text-2xl font-bold text-gray-800">{item.storage_location || 'Not specified'}</p>
            </div>
            <div className="p-4 bg-gray-100 rounded-lg">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Current Stock</h2>
              <p className="text-2xl font-bold text-gray-800">
                {formatQuantityWithUnit(item.stock_quantity, item.unit_of_measure)}
              </p>
            </div>
            <div className="p-4 bg-gray-100 rounded-lg">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Cost Per Unit</h2>
              <p className="text-2xl font-bold text-gray-800">
                {item.cost_per_unit ? `$${item.cost_per_unit}` : 'Not set'}
              </p>
            </div>
            <div className="p-4 bg-gray-100 rounded-lg">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Alert Threshold</h2>
              <p className="text-2xl font-bold text-gray-800">
                {item.alert_threshold ? formatQuantityWithUnit(item.alert_threshold, item.unit_of_measure) : 'Not set'}
              </p>
            </div>
            {/* Barcode */}
            <div className="p-4 bg-gray-100 rounded-lg sm:col-span-2">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Barcode / SKU</h2>
              <p className="text-2xl font-bold text-gray-800 font-mono tracking-widest">{item.barcode || 'Not set'}</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
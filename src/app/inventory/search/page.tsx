// src/app/inventory/search/page.tsx
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import { formatQuantityWithUnit } from '@/lib/pluralize-unit';
import Link from 'next/link';

// Define the shape of the Item object for type safety
interface Item {
  id: number;
  name: string;
  storage_location: string;
  stock_quantity: number;
  unit_of_measure: string;
}

// Define the shape of the props for this page
interface SearchPageProps {
  searchParams: Promise<{
    q?: string;
  }>;
}

// THIS IS THE CORRECTED FUNCTION SIGNATURE
export default async function SearchResultsPage({ searchParams }: SearchPageProps) {
  // Await the searchParams promise to get the resolved object
  const resolvedSearchParams = await searchParams;
  const query = resolvedSearchParams.q || '';

  let items: Item[] = [];

  if (query) {
    const { data } = await supabase
      .from('items')
      .select('*')
      .ilike('name', `%${query}%`);
    items = data || [];
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <header className="mb-10">
        <Link href="/" className="text-blue-500 hover:underline mb-4 block">&larr; Back to Dashboard</Link>
        <h1 className="text-4xl font-bold text-gray-800">Search Results for "{query}"</h1>
      </header>
      <main className="bg-white p-8 rounded-lg shadow-md max-w-4xl mx-auto">
        {items.length > 0 ? (
          <ul className="divide-y divide-gray-200">
            {items.map((item: Item) => (
              <li key={item.id} className="py-4">
                <Link
                  href={`/inventory/${item.id}`}
                  className="block hover:bg-gray-50 p-2 rounded-md"
                >
                  <p className="font-semibold text-lg text-blue-600">{item.name}</p>
                  <p className="text-sm text-gray-600">Location: {item.storage_location}</p>
                  <p className="text-sm text-gray-600">Stock: {formatQuantityWithUnit(item.stock_quantity, item.unit_of_measure)}</p>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-center text-gray-500">No items found matching your search.</p>
        )}
      </main>
    </div>
  );
}
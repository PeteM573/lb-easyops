// src/app/inventory/report/page.tsx
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';

// Define the shape of an Item for type safety
interface Item {
    id: number;
    name: string;
    category: string;
    storage_location: string;
    stock_quantity: number;
    unit_of_measure: string;
    cost_per_unit: number | null;
}

async function getInventoryData() {
    // Fetch all items and order them by name for a clean default view
    const { data, error } = await supabase
        .from('items')
        .select('*')
        .order('name', { ascending: true });

    if (error) {
        console.error("Error fetching inventory report data:", error);
        return [];
    }
    return data;
}

export default async function InventoryReportPage() {
    const items: Item[] = await getInventoryData();

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <header className="mb-10">
                <Link href="/" className="text-blue-500 hover:underline mb-4 block">&larr; Back to Dashboard</Link>
                <h1 className="text-4xl font-bold text-gray-800">Full Inventory Report</h1>
                <p className="text-lg text-gray-500">A complete overview of all items in stock.</p>
            </header>

            <main className="bg-white p-6 rounded-lg shadow-md">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock Quantity</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cost Per Unit</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {items.map((item) => (
                                <tr key={item.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600 hover:underline">
                                        <Link href={`/inventory/${item.id}`}>{item.name}</Link>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.category}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.storage_location}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.stock_quantity} {item.unit_of_measure}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {item.cost_per_unit ? `$${item.cost_per_unit.toFixed(2)}` : 'N/A'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </main>
        </div>
    );
}
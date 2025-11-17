// src/app/inventory/new/page.tsx
'use client';

import React, { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function NewItemPage() {
  const router = useRouter();
  const [itemName, setItemName] = useState('');
  const [category, setCategory] = useState('Consumable');
  const [barcode, setBarcode] = useState('');
  const [location, setLocation] = useState('');
  const [quantity, setQuantity] = useState(0);
  const [uom, setUom] = useState('');
  const [cost, setCost] = useState(0);
  const [threshold, setThreshold] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    const { error: insertError } = await supabase.from('items').insert({
      name: itemName,
      category: category,
      storage_location: location,
      stock_quantity: quantity,
      unit_of_measure: uom,
      cost_per_unit: cost,
      alert_threshold: threshold,
      barcode: barcode || null,
    });

    setIsSubmitting(false);

    if (insertError) {
      setError(`Failed to add item: ${insertError.message}`);
    } else {
      setSuccess(`Successfully added "${itemName}" to inventory!`);
      // Optionally reset the form
      setItemName('');
      setCategory('Consumable');
      // ... reset other fields if desired
      
      // Redirect back to the dashboard after a short delay
      setTimeout(() => {
        router.push('/');
      }, 2000);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <header className="mb-10">
        <Link href="/" className="text-blue-500 hover:underline mb-4 block">&larr; Back to Dashboard</Link>
        <h1 className="text-4xl font-bold text-gray-800">Add New Inventory Item</h1>
        <p className="text-lg text-gray-500">Enter the details for the new product.</p>
      </header>
      
      <main>
        <form onSubmit={handleSubmit} className="bg-white p-8 rounded-lg shadow-md max-w-2xl mx-auto space-y-6">
          
          <div>
            <label htmlFor="itemName" className="block text-sm font-medium text-gray-700">Item Name</label>
            <input type="text" id="itemName" value={itemName} onChange={(e) => setItemName(e.target.value)} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"/>
          </div>

          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700">Category</label>
            <select id="category" value={category} onChange={(e) => setCategory(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500">
              <option>Consumable</option>
              <option>Retail</option>
            </select>
          </div>
          <div>
            <label htmlFor="barcode" className="block text-sm font-medium text-gray-700">Barcode / SKU</label>
            <input type="text" id="barcode" value={barcode} onChange={(e) => setBarcode(e.target.value)} placeholder="e.g., 123456789012" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"/>
          </div>
          <div>
            <label htmlFor="location" className="block text-sm font-medium text-gray-700">Storage Location</label>
            <input type="text" id="location" value={location} onChange={(e) => setLocation(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"/>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
                <label htmlFor="quantity" className="block text-sm font-medium text-gray-700">Initial Quantity</label>
                <input type="number" step="0.01" id="quantity" value={quantity} onChange={(e) => setQuantity(parseFloat(e.target.value))} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"/>
            </div>
            <div>
                <label htmlFor="uom" className="block text-sm font-medium text-gray-700">Unit of Measure (UOM)</label>
                <input type="text" id="uom" placeholder="e.g., lbs, units, gallons" value={uom} onChange={(e) => setUom(e.target.value)} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"/>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
                <label htmlFor="cost" className="block text-sm font-medium text-gray-700">Cost Per Unit ($)</label>
                <input type="number" step="0.01" id="cost" value={cost} onChange={(e) => setCost(parseFloat(e.target.value))} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"/>
            </div>
            <div>
                <label htmlFor="threshold" className="block text-sm font-medium text-gray-700">Low Stock Alert Threshold</label>
                <input type="number" step="0.01" id="threshold" value={threshold} onChange={(e) => setThreshold(parseFloat(e.target.value))} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"/>
            </div>
          </div>

          <div className="border-t pt-6">
            <button type="submit" disabled={isSubmitting} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg disabled:bg-gray-400">
              {isSubmitting ? 'Adding...' : 'Add Item to Inventory'}
            </button>
          </div>

          {error && <p className="text-red-500 text-center">{error}</p>}
          {success && <p className="text-green-500 text-center">{success}</p>}
        </form>
      </main>
    </div>
  );
}
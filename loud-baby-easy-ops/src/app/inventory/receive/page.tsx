// src/app/inventory/receive/page.tsx
'use client';

import React, { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';

// Define the shape of an inventory item
interface Item {
  id: number;
  name: string;
  stock_quantity: number;
  unit_of_measure: string;
}

export default function ReceiveStockPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Item[]>([]);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [quantityReceived, setQuantityReceived] = useState<number | ''>('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // --- Search for items in the database ---
  const handleSearch = async () => {
    if (searchQuery.trim() === '') {
      setSearchResults([]);
      return;
    }
    setIsLoading(true);
    setError(null);
    setSelectedItem(null); // Clear previous selection

    const { data, error } = await supabase
      .from('items')
      .select('id, name, stock_quantity, unit_of_measure')
      .ilike('name', `%${searchQuery}%`); // Case-insensitive "contains" search

    setIsLoading(false);
    if (error) {
      setError(`Search failed: ${error.message}`);
    } else {
      setSearchResults(data || []);
    }
  };

  // --- Update the stock for the selected item ---
  const handleUpdateStock = async () => {
    if (!selectedItem || quantityReceived === '' || quantityReceived <= 0) {
      setError('Please select an item and enter a valid quantity received.');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    const newQuantity = selectedItem.stock_quantity + quantityReceived;

    const { error: updateError } = await supabase
      .from('items')
      .update({ stock_quantity: newQuantity })
      .eq('id', selectedItem.id);

    setIsLoading(false);
    if (updateError) {
      setError(`Update failed: ${updateError.message}`);
    } else {
      setSuccess(`Success! "${selectedItem.name}" stock is now ${newQuantity} ${selectedItem.unit_of_measure}.`);
      setSelectedItem(null); // Reset for the next receiving task
      setSearchQuery('');
      setSearchResults([]);
      setQuantityReceived('');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <header className="mb-10">
        <Link href="/" className="text-blue-500 hover:underline mb-4 block">&larr; Back to Dashboard</Link>
        <h1 className="text-4xl font-bold text-gray-800">Receive Shipment</h1>
        <p className="text-lg text-gray-500">Search for an item to update its stock level.</p>
      </header>
      
      <main className="bg-white p-8 rounded-lg shadow-md max-w-2xl mx-auto">
        
        {/* Step 1: Search for an Item (if no item is selected) */}
        {!selectedItem && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-800">Find Item</h2>
            <div className="flex space-x-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name (e.g., Honey)"
                className="flex-grow px-3 py-2 border border-gray-300 rounded-md shadow-sm"
              />
              <button onClick={handleSearch} disabled={isLoading} className="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg disabled:bg-gray-400">
                {isLoading ? 'Searching...' : 'Search'}
              </button>
            </div>
            {/* Search Results */}
            <ul className="space-y-2">
              {searchResults.map(item => (
                <li key={item.id} onClick={() => setSelectedItem(item)} className="p-3 border rounded-md hover:bg-gray-100 cursor-pointer">
                  <p className="font-semibold">{item.name}</p>
                  <p className="text-sm text-gray-500">Current Stock: {item.stock_quantity} {item.unit_of_measure}</p>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Step 2: Update the Selected Item */}
        {selectedItem && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-800">Update: {selectedItem.name}</h2>
                <button onClick={() => setSelectedItem(null)} className="text-sm text-blue-500 hover:underline">Search for another item</button>
            </div>
            <p className="text-gray-600">Current Stock: {selectedItem.stock_quantity} {selectedItem.unit_of_measure}</p>
            <div>
              <label htmlFor="quantityReceived" className="block text-sm font-medium text-gray-700">Quantity Received</label>
              <input
                type="number"
                id="quantityReceived"
                value={quantityReceived}
                onChange={(e) => setQuantityReceived(e.target.value === '' ? '' : parseFloat(e.target.value))}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                placeholder={`Enter amount in ${selectedItem.unit_of_measure}`}
              />
            </div>
            <button onClick={handleUpdateStock} disabled={isLoading} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg disabled:bg-gray-400">
              {isLoading ? 'Updating...' : 'Add to Stock'}
            </button>
          </div>
        )}
        
        {/* Feedback Messages */}
        {error && <p className="text-red-500 text-center mt-4">{error}</p>}
        {success && <p className="text-green-500 text-center mt-4">{success}</p>}
      </main>
    </div>
  );
}
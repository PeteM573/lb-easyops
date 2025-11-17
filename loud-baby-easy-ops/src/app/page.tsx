// src/app/page.tsx
'use client'; 

import React, { useState } from 'react';
import WebhookDeductionModal from '@/components/WebhookDeductionModal';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
        router.push(`/inventory/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const criticalAlerts = [
    { id: 'item-Honey', message: 'Honey stock is low (4.5 lbs remaining)' },
    { id: 'reminder-License', message: 'Business License Renewal due in 30 days' }
  ];

  const sampleOrderItems = [
    { name: 'Mocha Latte', quantity: 1 },
    { name: 'Baby Jacket (S)', quantity: 1 },
    { name: 'Teething Ring', quantity: 1 }
  ];

  const handleOpenModal = () => setIsModalOpen(true);
  const handleCloseModal = () => setIsModalOpen(false);

  return (
    <>
      <WebhookDeductionModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        orderNumber="1234"
        items={sampleOrderItems}
      />

      <div className="min-h-screen bg-gray-50 p-8">
        <header className="mb-10 flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-gray-800">Loud Baby Easy Ops</h1>
            <p className="text-lg text-gray-500">Dashboard</p>
          </div>
          <button
            onClick={handleOpenModal}
            className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-6 rounded-lg shadow-md transition duration-300 animate-pulse"
          >
            Simulate a Square Sale
          </button>
        </header>

        <main className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Critical Alerts Card */}
          <div className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
            <h2 className="text-2xl font-semibold text-gray-700 mb-4">Critical Alerts</h2>
            <div className="space-y-3">
              {criticalAlerts.map(alert => (
                <div key={alert.id} className="p-4 bg-red-100 border-l-4 border-red-500 text-red-700">
                  <p>{alert.message}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Tasks Overview Card */}
          <div className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
            <h2 className="text-2xl font-semibold text-gray-700 mb-4">Tasks Overview</h2>
            <div className="space-y-2">
              <p className="text-lg text-gray-600"><span className="font-bold">3</span> Open Tasks</p>
              <p className="text-lg text-gray-600"><span className="font-bold">1</span> Due Today</p>
              <button className="mt-4 w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg">View All Tasks</button>
            </div>
          </div>

          {/* Inventory Lookup Card */}
          <div className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
            <h2 className="text-2xl font-semibold text-gray-700 mb-4">Inventory Lookup</h2>
            <form onSubmit={handleSearch}>
              <input
                type="text"
                placeholder="Search for an item..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
              <button type="submit" className="mt-4 w-full bg-gray-700 hover:bg-gray-800 text-white font-bold py-2 px-4 rounded-lg">Search</button>
            </form>
          </div>
          
          {/* Quick Actions Card - UPDATED WITH NEW LINK SYNTAX */}
          <div className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
            <h2 className="text-2xl font-semibold text-gray-700 mb-4">Quick Actions</h2>
            <div className="space-y-3">
              <Link
                href="/inventory/new"
                className="block w-full text-center bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-4 rounded-lg transition duration-300"
              >
                + Add New Item
              </Link>
              <Link
                href="/inventory/receive"
                className="block w-full text-center bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-4 rounded-lg transition duration-300"
              >
                Receive Stock
              </Link>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
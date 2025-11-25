// src/app/inventory/scan/page.tsx
'use client';

import React, { useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Package } from 'lucide-react';
import BarcodeScanner from '@/components/BarcodeScanner';

export default function ScanPage() {
  const router = useRouter();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [scannerOpen, setScannerOpen] = useState(true); // Auto-open scanner
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleScanSuccess = async (barcode: string) => {
    setLoading(true);
    setError(null);

    try {
      // Fetch item from database
      const { data, error: dbError } = await supabase
        .from('items')
        .select('id, name')
        .eq('barcode', barcode)
        .single();

      if (dbError || !data) {
        setError(`Item not found for barcode: ${barcode}`);
        setLoading(false);
        // Keep scanner closed, show error
      } else {
        // Redirect to item edit page to show details
        router.push(`/inventory/edit?id=${data.id}`);
      }
    } catch (err) {
      console.error('Error fetching item:', err);
      setError('Failed to look up item. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6 pb-24">
      {/* Header */}
      <header className="max-w-2xl mx-auto mb-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft size={20} />
          <span>Back to Dashboard</span>
        </Link>

        <div className="flex items-center gap-4">
          <div className="p-3 bg-primary/10 rounded-xl">
            <Package className="text-primary" size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Scan Barcode</h1>
            <p className="text-gray-600 mt-1">
              Point your camera at an item's barcode or QR code
            </p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto">

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
            <p className="text-red-800 font-medium mb-3">{error}</p>
            <button
              onClick={() => {
                setError(null);
                setScannerOpen(true);
              }}
              className="h-12 px-6 bg-primary text-white font-semibold rounded-xl hover:bg-primary/90 transition-colors"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 text-center">
            <p className="text-blue-800 font-medium">Looking up item...</p>
          </div>
        )}

        {/* Instructions */}
        {!scannerOpen && !error && !loading && (
          <div className="bg-white border border-border rounded-xl p-6 text-center">
            <Package className="mx-auto mb-4 text-gray-400" size={48} />
            <h2 className="text-xl font-bold text-foreground mb-2">Ready to Scan</h2>
            <p className="text-gray-600 mb-6">
              Click the button below to open the camera and scan a barcode
            </p>
            <button
              onClick={() => setScannerOpen(true)}
              className="h-12 px-8 bg-primary text-white font-semibold rounded-xl hover:bg-primary/90 transition-colors"
            >
              Open Scanner
            </button>
          </div>
        )}
      </main>

      {/* Barcode Scanner Component */}
      <BarcodeScanner
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScanSuccess={handleScanSuccess}
        title="Scan Item Barcode"
        subtitle="Point camera at barcode to look up item"
      />
    </div>
  );
}
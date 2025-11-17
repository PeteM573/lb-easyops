// src/app/inventory/scan/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { createClient } from '@/lib/supabase-browser';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function ScanPage() {
  const router = useRouter();
  const supabase = createClient();
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Initialize the scanner
    const scanner = new Html5QrcodeScanner(
      'reader', // The ID of the div element where the scanner will be rendered
      {
        qrbox: {
          width: 250,
          height: 250,
        },
        fps: 5, // frames per second
      },
      false // verbose output
    );

    // --- Define what happens on a successful scan ---
    const onScanSuccess = async (decodedText: string) => {
      scanner.clear(); // Stop the scanner
      setScanResult(`Looking for item with barcode: ${decodedText}`);

      // --- Find the item in our database ---
      const { data, error: dbError } = await supabase
        .from('items')
        .select('id')
        .eq('barcode', decodedText)
        .single();

      if (dbError || !data) {
        setError(`Item not found for barcode: ${decodedText}. Please add it first.`);
      } else {
        // --- If found, redirect to the item's detail page ---
        router.push(`/inventory/${data.id}`);
      }
    };

    // --- Define what happens on a scan failure ---
    const onScanFailure = (error: any) => {
      // This is called frequently, so we don't want to spam the console.
      // You can add more robust error handling here if needed.
    };

    // Start scanning
    scanner.render(onScanSuccess, onScanFailure);

    // Cleanup function to clear the scanner when the component unmounts
    return () => {
      scanner.clear().catch(err => console.error("Failed to clear scanner", err));
    };
  }, [router, supabase]);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <header className="mb-6 text-center">
        <h1 className="text-4xl font-bold text-gray-800">Scan Barcode</h1>
        <p className="text-lg text-gray-500">Point your camera at an item's barcode or SKU.</p>
        <Link href="/" className="text-blue-500 hover:underline mt-2 inline-block">&larr; Back to Dashboard</Link>
      </header>

      <main className="max-w-md mx-auto bg-white p-4 rounded-lg shadow-md">
        {/* The scanner will be rendered inside this div */}
        <div id="reader"></div>

        {scanResult && <p className="text-green-600 text-center mt-4">{scanResult}</p>}
        {error && <p className="text-red-600 text-center mt-4">{error}</p>}
      </main>
    </div>
  );
}
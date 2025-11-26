// src/app/inventory/new/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { PackagePlus, MapPin, DollarSign, AlertCircle, Check, X, Package, Loader2, Barcode as BarcodeIcon } from 'lucide-react';
import BarcodeGenerator from '@/components/BarcodeGenerator';
import BarcodePrintButton from '@/components/BarcodePrintButton';

export default function NewItemPage() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const router = useRouter();
  const searchParams = useSearchParams();

  const [itemName, setItemName] = useState('');
  const [category, setCategory] = useState('Retail');
  const [barcode, setBarcode] = useState('');
  const [barcodeNumber, setBarcodeNumber] = useState('');
  const [location, setLocation] = useState(''); // Legacy storage_location
  const [quantity, setQuantity] = useState<number | ''>('');
  const [uom, setUom] = useState('');
  const [cost, setCost] = useState<number | ''>('');
  const [threshold, setThreshold] = useState<number | ''>('');

  // Multi-location support
  const [locations, setLocations] = useState<{ id: number; name: string; is_default: boolean }[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<number | ''>('');

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Helper function to generate unique 10-digit barcode number
  const generateBarcodeNumber = () => {
    // Generate random 10-digit number
    const randomNumber = Math.floor(1000000000 + Math.random() * 9000000000);
    return randomNumber.toString();
  };

  // Helper function to convert to smart title case
  // Preserves single letters (S, M, L) and handles abbreviations (H&S)
  const toTitleCase = (str: string) => {
    return str
      .split(' ')
      .map(word => {
        // If the word is a single character, keep it uppercase
        if (word.length === 1) {
          return word.toUpperCase();
        }

        // If word contains &, preserve each part's capitalization for abbreviations
        if (word.includes('&')) {
          return word.split('&').map(part => {
            if (part.length === 1) return part.toUpperCase();
            return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
          }).join('&');
        }

        // Standard title case for regular words
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      })
      .join(' ');
  };

  useEffect(() => {
    const fetchLocations = async () => {
      // Check if barcode was passed from scan page
      const barcodeParam = searchParams.get('barcode');
      if (barcodeParam) {
        setBarcode(barcodeParam);
      }

      const { data, error } = await supabase
        .from('locations')
        .select('*')
        .order('id', { ascending: true });

      if (data) {
        setLocations(data);
        // Set default location if available
        const defaultLoc = data.find(l => l.is_default);
        if (defaultLoc) {
          setSelectedLocationId(defaultLoc.id);
        } else if (data.length > 0) {
          setSelectedLocationId(data[0].id);
        }
      }
      setIsLoading(false);
    };
    fetchLocations();
  }, [supabase, searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    if (quantity !== '' && quantity > 0 && selectedLocationId === '') {
      setError('Please select a location for the initial stock.');
      setIsSubmitting(false);
      return;
    }

    // 0.5. Auto-generate barcode number if empty
    const finalBarcodeNumber = barcodeNumber.trim() || generateBarcodeNumber();

    // 1. Insert Item
    const { data: newItem, error: insertError } = await supabase
      .from('items')
      .insert({
        name: itemName,
        category: category,
        storage_location: location,
        stock_quantity: quantity === '' ? 0 : quantity,
        unit_of_measure: uom,
        cost_per_unit: cost === '' ? 0 : cost,
        alert_threshold: threshold === '' ? 0 : threshold,
        barcode: barcode || null,
        barcode_number: finalBarcodeNumber,
      })
      .select()
      .single();

    if (insertError || !newItem) {
      setError(`Failed to add item: ${insertError?.message} `);
      setIsSubmitting(false);
      return;
    }

    // 2. Insert Item Location (if quantity > 0)
    if (quantity !== '' && quantity > 0 && selectedLocationId) {
      const { error: locError } = await supabase
        .from('item_locations')
        .insert({
          item_id: newItem.id,
          location_id: Number(selectedLocationId),
          quantity: quantity
        });

      if (locError) {
        // Non-blocking error, but good to log
        console.error('Failed to create item_location record:', locError);
      }
    }

    setIsSubmitting(false);
    setSuccess(`Successfully added "${itemName}" to inventory!`);

    setTimeout(() => {
      router.push('/inventory/report');
    }, 1500);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center gap-3 text-gray-500">
          <Loader2 className="animate-spin" size={24} />
          <span>Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">

      {/* Header */}
      <div className="sticky top-0 bg-background z-10 pt-6 pb-4 px-4 md:px-8 border-b border-border">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-2">
            <Link href="/inventory/report" className="text-sm text-gray-500 hover:text-foreground transition-colors">
              ← Back
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/10 text-primary rounded-xl">
              <PackagePlus size={28} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Add New Item</h1>
              <p className="text-sm text-gray-500">Enter the details for your inventory item</p>
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      <main className="px-4 md:px-8 py-6">
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto space-y-6">

          {/* Success/Error Messages */}
          {success && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
              <div className="p-2 bg-green-100 text-green-700 rounded-full shrink-0">
                <Check size={20} />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-green-900">Success!</p>
                <p className="text-sm text-green-700">{success}</p>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
              <div className="p-2 bg-red-100 text-red-700 rounded-full shrink-0">
                <X size={20} />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-red-900">Error</p>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          )}

          {/* Basic Information Section */}
          <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
            <div className="bg-gray-50 px-6 py-3 border-b border-border">
              <h2 className="font-semibold text-foreground flex items-center gap-2">
                <Package size={18} />
                Basic Information
              </h2>
            </div>
            <div className="p-6 space-y-5">

              {/* Item Name */}
              <div>
                <label htmlFor="itemName" className="block text-sm font-medium text-foreground mb-2">
                  Item Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="itemName"
                  value={itemName}
                  onChange={(e) => setItemName(toTitleCase(e.target.value))}
                  required
                  placeholder="e.g., Whole Milk, Honey Butter, Coffee Beans"
                  className="block w-full h-12 px-4 rounded-xl border border-input bg-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-base"
                />
              </div>

              {/* Category */}
              <div>
                <label htmlFor="category" className="block text-sm font-medium text-foreground mb-2">
                  Category <span className="text-red-500">*</span>
                </label>
                <select
                  id="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="block w-full h-12 px-4 rounded-xl border border-input bg-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-base"
                >
                  <option value="Retail">Retail</option>
                  <option value="Accessories">Accessories</option>
                  <option value="Raw Materials">Raw Materials</option>
                  <option value="Consumables">Consumables</option>
                </select>
                <p className="mt-1.5 text-xs text-gray-500">
                  {category === 'Retail' && '💡 Finished products sold directly to customers'}
                  {category === 'Accessories' && '💡 Add-on items and complementary products'}
                  {category === 'Raw Materials' && '💡 Base ingredients and supplies for production'}
                  {category === 'Consumables' && '💡 Paper goods and disposable items'}
                </p>
              </div>

              {/* Barcode */}
              <div>
                <label htmlFor="barcode" className="block text-sm font-medium text-foreground mb-2">
                  Barcode / SKU <span className="text-gray-400 text-xs font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  id="barcode"
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  placeholder="e.g., 123456789012"
                  className="block w-full h-12 px-4 rounded-xl border border-input bg-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-base"
                />
              </div>

              {/* Storage Location (Legacy) */}
              <div>
                <label htmlFor="location" className="block text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                  <MapPin size={16} className="text-gray-400" />
                  Shelf/Bin Label <span className="text-gray-400 text-xs font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  id="location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g., Shelf A3"
                  className="block w-full h-12 px-4 rounded-xl border border-input bg-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-base"
                />
              </div>

            </div>
          </div>

          {/* Barcode & Labels Section */}
          <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
            <div className="bg-gray-50 px-6 py-3 border-b border-border">
              <h2 className="font-semibold text-foreground flex items-center gap-2">
                <BarcodeIcon size={18} />
                Barcode & Labels
              </h2>
            </div>
            <div className="p-6 space-y-6">

              {/* Barcode Number Input */}
              <div>
                <label htmlFor="barcodeNumber" className="block text-sm font-medium text-foreground mb-2">
                  Printable Barcode Number
                  <span className="text-gray-400 text-xs font-normal ml-2">(Auto-generated if left blank)</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    id="barcodeNumber"
                    value={barcodeNumber}
                    onChange={(e) => setBarcodeNumber(e.target.value)}
                    placeholder="Will auto-generate 10-digit number on save"
                    className="flex-1 h-12 px-4 rounded-xl border border-input bg-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-base"
                  />
                  <button
                    type="button"
                    onClick={() => setBarcodeNumber(generateBarcodeNumber())}
                    className="px-4 h-12 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors"
                  >
                    Generate
                  </button>
                </div>
                <p className="mt-1.5 text-xs text-gray-500">
                  This is separate from the scanned barcode. Used for printing labels.
                </p>
              </div>

              {/* Barcode Display */}
              {barcodeNumber && (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Preview
                    </label>
                    <BarcodeGenerator value={barcodeNumber} />
                  </div>
                </div>
              )}

            </div>
          </div>

          {/* Stock & Pricing Section */}
          <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
            <div className="bg-gray-50 px-6 py-3 border-b border-border">
              <h2 className="font-semibold text-foreground flex items-center gap-2">
                <DollarSign size={18} />
                Stock & Pricing
              </h2>
            </div>
            <div className="p-6 space-y-5">

              {/* Quantity and UOM */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="quantity" className="block text-sm font-medium text-foreground mb-2">
                    Initial Quantity <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    id="quantity"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value ? parseFloat(e.target.value) : '')}
                    required
                    min="0"
                    inputMode="decimal"
                    placeholder="0"
                    className="block w-full h-12 px-4 rounded-xl border border-input bg-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-base"
                  />
                </div>
                <div>
                  <label htmlFor="uom" className="block text-sm font-medium text-foreground mb-2">
                    Unit of Measure <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="uom"
                    placeholder="e.g., lbs, oz, gallons, units"
                    value={uom}
                    onChange={(e) => setUom(e.target.value)}
                    required
                    className="block w-full h-12 px-4 rounded-xl border border-input bg-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-base"
                  />
                </div>
              </div>

              {/* Initial Location Selection */}
              {quantity !== '' && quantity > 0 && (
                <div className="animate-in fade-in slide-in-from-top-2">
                  <label htmlFor="initialLocation" className="block text-sm font-medium text-foreground mb-2">
                    Assign Initial Stock To <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="initialLocation"
                    value={selectedLocationId}
                    onChange={(e) => setSelectedLocationId(Number(e.target.value))}
                    required
                    className="block w-full h-12 px-4 rounded-xl border border-input bg-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-base"
                  >
                    <option value="" disabled>Select a location</option>
                    {locations.map(loc => (
                      <option key={loc.id} value={loc.id}>
                        {loc.name} {loc.is_default ? '(Default)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg p-3 flex items-start gap-2">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <span><strong>Important:</strong> Be specific with units (e.g., "10 oz" vs "10 lbs") to avoid confusion!</span>
              </p>

              {/* Cost and Threshold */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="cost" className="block text-sm font-medium text-foreground mb-2">
                    Cost Per Unit ($)
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                    <input
                      type="number"
                      step="0.01"
                      id="cost"
                      value={cost}
                      onChange={(e) => setCost(e.target.value ? parseFloat(e.target.value) : '')}
                      min="0"
                      inputMode="decimal"
                      placeholder="0.00"
                      className="block w-full h-12 pl-8 pr-4 rounded-xl border border-input bg-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-base"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="threshold" className="block text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                    <AlertCircle size={16} className="text-gray-400" />
                    Low Stock Alert
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    id="threshold"
                    value={threshold}
                    onChange={(e) => setThreshold(e.target.value ? parseFloat(e.target.value) : '')}
                    min="0"
                    inputMode="decimal"
                    placeholder="e.g., 5"
                    className="block w-full h-12 px-4 rounded-xl border border-input bg-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-base"
                  />
                  <p className="mt-1.5 text-xs text-gray-500">Get notified when stock falls below this amount</p>
                </div>
              </div>

            </div>
          </div>

          {/* Submit Button */}
          <div className="flex gap-3">
            <Link
              href="/inventory/report"
              className="flex-1 h-12 px-6 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-colors flex items-center justify-center"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 h-12 px-6 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  Adding...
                </>
              ) : (
                <>
                  <PackagePlus size={20} />
                  Add to Inventory
                </>
              )}
            </button>
          </div>

        </form>
      </main>
    </div>
  );
}
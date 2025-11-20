// src/app/inventory/new/page.tsx
'use client';

import React, { useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PackagePlus, MapPin, DollarSign, AlertCircle, Check, X, Package } from 'lucide-react';

export default function NewItemPage() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const router = useRouter();
  const [itemName, setItemName] = useState('');
  const [category, setCategory] = useState('Retail');
  const [barcode, setBarcode] = useState('');
  const [location, setLocation] = useState('');
  const [quantity, setQuantity] = useState<number | ''>('');
  const [uom, setUom] = useState('');
  const [cost, setCost] = useState<number | ''>('');
  const [threshold, setThreshold] = useState<number | ''>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Helper function to convert to title case
  const toTitleCase = (str: string) => {
    return str
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    const { error: insertError } = await supabase.from('items').insert({
      name: itemName,
      category: category,
      storage_location: location,
      stock_quantity: quantity === '' ? 0 : quantity,
      unit_of_measure: uom,
      cost_per_unit: cost === '' ? 0 : cost,
      alert_threshold: threshold === '' ? 0 : threshold,
      barcode: barcode || null,
    });

    setIsSubmitting(false);

    if (insertError) {
      setError(`Failed to add item: ${insertError.message}`);
    } else {
      setSuccess(`Successfully added "${itemName}" to inventory!`);
      // Reset the form
      setTimeout(() => {
        router.push('/');
      }, 1500);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">

      {/* Header */}
      <div className="sticky top-0 bg-background z-10 pt-6 pb-4 px-4 md:px-8 border-b border-border">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-2">
            <Link href="/" className="text-sm text-gray-500 hover:text-foreground transition-colors">
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

              {/* Storage Location */}
              <div>
                <label htmlFor="location" className="block text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                  <MapPin size={16} className="text-gray-400" />
                  Storage Location
                </label>
                <input
                  type="text"
                  id="location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g., Walk-in Cooler, Shelf A3, Back Storage"
                  className="block w-full h-12 px-4 rounded-xl border border-input bg-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-base"
                />
              </div>

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
              href="/"
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
                  <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
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
'use client';

import React, { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { PackagePlus, MapPin, DollarSign, AlertCircle, Check, X, Package, Loader2, Edit } from 'lucide-react';

export default function EditItemPage() {
    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const router = useRouter();
    const searchParams = useSearchParams();
    const itemId = searchParams.get('id');

    const [itemName, setItemName] = useState('');
    const [category, setCategory] = useState('Retail');
    const [barcode, setBarcode] = useState('');
    const [location, setLocation] = useState(''); // Legacy storage_location string
    const [uom, setUom] = useState('');
    const [cost, setCost] = useState<number | ''>('');
    const [threshold, setThreshold] = useState<number | ''>('');

    // Multi-location state
    const [locations, setLocations] = useState<{ id: number; name: string }[]>([]);
    const [stockMap, setStockMap] = useState<Record<number, number>>({});

    const [isLoading, setIsLoading] = useState(true);
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

    useEffect(() => {
        const fetchData = async () => {
            if (!itemId) {
                setError('No item ID provided');
                setIsLoading(false);
                return;
            }

            // 1. Fetch Item
            const { data: itemData, error: itemError } = await supabase
                .from('items')
                .select('*')
                .eq('id', itemId)
                .single();

            if (itemError || !itemData) {
                setError('Item not found');
                setIsLoading(false);
                return;
            }

            // 2. Fetch All Locations
            const { data: locData, error: locError } = await supabase
                .from('locations')
                .select('id, name')
                .order('id', { ascending: true });

            if (locData) setLocations(locData);

            // 3. Fetch Item Stock per Location
            const { data: stockData, error: stockError } = await supabase
                .from('item_locations')
                .select('location_id, quantity')
                .eq('item_id', itemId);

            const initialStockMap: Record<number, number> = {};
            // Initialize with 0 for all locations
            locData?.forEach(l => initialStockMap[l.id] = 0);
            // Fill with actual data
            stockData?.forEach(s => initialStockMap[s.location_id] = s.quantity);
            setStockMap(initialStockMap);

            // Pre-fill form
            setItemName(itemData.name || '');
            setCategory(itemData.category || 'Retail');
            setBarcode(itemData.barcode || '');
            setLocation(itemData.storage_location || '');
            setUom(itemData.unit_of_measure || '');
            setCost(itemData.cost_per_unit ?? '');
            setThreshold(itemData.alert_threshold ?? '');

            setIsLoading(false);
        };

        fetchData();
    }, [itemId, supabase]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);
        setSuccess(null);

        // 1. Calculate new total stock
        const totalStock = Object.values(stockMap).reduce((sum, qty) => sum + qty, 0);

        // 2. Update Item Details
        const { error: updateError } = await supabase
            .from('items')
            .update({
                name: itemName,
                category: category,
                storage_location: location,
                stock_quantity: totalStock,
                unit_of_measure: uom,
                cost_per_unit: cost === '' ? 0 : cost,
                alert_threshold: threshold === '' ? 0 : threshold,
                barcode: barcode || null,
            })
            .eq('id', itemId);

        if (updateError) {
            setError(`Failed to update item: ${updateError.message}`);
            setIsSubmitting(false);
            return;
        }

        // 3. Update Item Locations
        const upsertData = Object.entries(stockMap).map(([locId, qty]) => ({
            item_id: Number(itemId),
            location_id: Number(locId),
            quantity: qty
        }));

        const { error: locUpdateError } = await supabase
            .from('item_locations')
            .upsert(upsertData, { onConflict: 'item_id, location_id' });

        setIsSubmitting(false);

        if (locUpdateError) {
            setError(`Failed to update stock locations: ${locUpdateError.message}`);
        } else {
            setSuccess(`Successfully updated "${itemName}"!`);
            setTimeout(() => {
                router.push('/inventory/report');
            }, 1500);
        }
    };

    const handleStockChange = (locId: number, val: string) => {
        const numVal = val === '' ? 0 : parseFloat(val);
        setStockMap(prev => ({ ...prev, [locId]: numVal }));
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="flex items-center gap-3 text-gray-500">
                    <Loader2 className="animate-spin" size={24} />
                    <span>Loading item...</span>
                </div>
            </div>
        );
    }

    if (error && !itemName) {
        return (
            <div className="min-h-screen bg-background p-4">
                <div className="max-w-3xl mx-auto mt-8 bg-red-50 border border-red-200 rounded-xl p-6">
                    <div className="flex items-start gap-3">
                        <AlertCircle className="text-red-600 shrink-0" size={24} />
                        <div>
                            <p className="font-semibold text-red-900">Error</p>
                            <p className="text-sm text-red-700">{error}</p>
                            <Link href="/inventory/report" className="text-sm text-red-600 hover:text-red-800 underline mt-2 inline-block">
                                ← Back to Inventory Report
                            </Link>
                        </div>
                    </div>
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
                            <Edit size={28} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-foreground">Edit Item</h1>
                            <p className="text-sm text-gray-500">Update item details</p>
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

                            {/* Storage Location (Legacy/Display) */}
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

                    {/* Stock & Pricing Section */}
                    <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
                        <div className="bg-gray-50 px-6 py-3 border-b border-border">
                            <h2 className="font-semibold text-foreground flex items-center gap-2">
                                <DollarSign size={18} />
                                Stock & Pricing
                            </h2>
                        </div>
                        <div className="p-6 space-y-5">

                            {/* Unit of Measure */}
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

                            {/* Stock per Location */}
                            <div className="space-y-3">
                                <label className="block text-sm font-medium text-foreground">
                                    Stock Quantity per Location
                                </label>
                                <div className="bg-gray-50 rounded-xl border border-border p-4 space-y-3">
                                    {locations.map(loc => (
                                        <div key={loc.id} className="flex items-center justify-between gap-4">
                                            <label htmlFor={`loc-${loc.id}`} className="text-sm font-medium text-gray-700 flex-1">
                                                {loc.name}
                                            </label>
                                            <div className="w-32">
                                                <input
                                                    type="number"
                                                    id={`loc-${loc.id}`}
                                                    step="0.01"
                                                    min="0"
                                                    value={stockMap[loc.id] ?? ''}
                                                    onChange={(e) => handleStockChange(loc.id, e.target.value)}
                                                    className="block w-full h-10 px-3 text-right rounded-lg border border-input bg-white focus:ring-2 focus:ring-primary outline-none"
                                                    placeholder="0"
                                                />
                                            </div>
                                        </div>
                                    ))}
                                    <div className="pt-2 border-t border-gray-200 flex justify-between items-center">
                                        <span className="font-bold text-gray-700">Total Stock</span>
                                        <span className="font-bold text-lg text-primary">
                                            {Object.values(stockMap).reduce((a, b) => a + b, 0)} {uom}
                                        </span>
                                    </div>
                                </div>
                            </div>

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
                                    Updating...
                                </>
                            ) : (
                                <>
                                    <Check size={20} />
                                    Update Item
                                </>
                            )}
                        </button>
                    </div>

                </form>
            </main>
        </div>
    );
}

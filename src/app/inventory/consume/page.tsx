'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import Link from 'next/link';
import { Search, ArrowLeft, Camera, AlertTriangle, Utensils, Trash2, AlertCircle } from 'lucide-react';
import BarcodeScanner from '@/components/BarcodeScanner';

// --- Types ---
interface Item {
    id: number;
    name: string;
    category: string;
    stock_quantity: number;
    unit: string;
    storage_location: string | null;
    barcode: string | null;
    cost_per_unit?: number; // For audit logging
}

export default function ConsumeStockPage() {
    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // --- State ---
    const [items, setItems] = useState<Item[]>([]);
    const [locations, setLocations] = useState<{ id: number; name: string }[]>([]);
    // Store stock per location for the selected item: { location_id: quantity }
    const [itemLocationStock, setItemLocationStock] = useState<Record<number, number>>({});

    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // The item currently being "consumed" (activates the modal)
    const [selectedItem, setSelectedItem] = useState<Item | null>(null);
    const [consumeQty, setConsumeQty] = useState<number | ''>('');
    const [selectedLocationId, setSelectedLocationId] = useState<number | ''>('');
    const [reason, setReason] = useState<string>('Consumed');
    const [submitting, setSubmitting] = useState(false);

    // Scanner state
    const [scannerOpen, setScannerOpen] = useState(false);
    const [scanError, setScanError] = useState<string>('');

    // --- Fetch Data on Mount ---
    useEffect(() => {
        const fetchData = async () => {
            // 1. Fetch Items
            const { data: itemsData, error: itemsError } = await supabase
                .from('items')
                .select('*')
                .order('name', { ascending: true });

            if (itemsError) console.error('Error fetching inventory:', itemsError);
            else setItems(itemsData || []);

            // 2. Fetch Locations
            const { data: locData, error: locError } = await supabase
                .from('locations')
                .select('id, name')
                .order('id', { ascending: true });

            if (locError) console.error('Error fetching locations:', locError);
            else setLocations(locData || []);

            setLoading(false);
        };
        fetchData();
    }, [supabase]);

    // --- Fetch Location Stock for Selected Item ---
    useEffect(() => {
        const fetchLocationStock = async () => {
            if (!selectedItem) return;

            const { data, error } = await supabase
                .from('item_locations')
                .select('location_id, quantity')
                .eq('item_id', selectedItem.id);

            if (error) {
                console.error('Error fetching location stock:', error);
            } else {
                const stockMap: Record<number, number> = {};
                data?.forEach(row => {
                    stockMap[row.location_id] = row.quantity;
                });
                setItemLocationStock(stockMap);

                // Auto-select first location with stock, or just the first location
                const locWithStock = data?.find(row => row.quantity > 0);
                if (locWithStock) {
                    setSelectedLocationId(locWithStock.location_id);
                } else if (locations.length > 0) {
                    setSelectedLocationId(locations[0].id);
                }
            }
        };

        if (selectedItem) {
            fetchLocationStock();
        } else {
            setItemLocationStock({});
            setSelectedLocationId('');
        }
    }, [selectedItem, supabase, locations]);

    // --- Filtering ---
    const filteredItems = useMemo(() => {
        if (!searchTerm) return items;
        const lowerTerm = searchTerm.toLowerCase();
        return items.filter((item) =>
            item.name.toLowerCase().includes(lowerTerm) ||
            item.category.toLowerCase().includes(lowerTerm) ||
            item.storage_location?.toLowerCase().includes(lowerTerm)
        );
    }, [items, searchTerm]);

    // --- Handlers ---
    const handleCardClick = (item: Item) => {
        setSelectedItem(item);
        setConsumeQty(''); // Reset input
        setReason('Consumed'); // Reset reason
    };

    const handleCloseModal = () => {
        setSelectedItem(null);
        setConsumeQty('');
        setReason('Consumed');
        setSelectedLocationId('');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedItem || !consumeQty || !selectedLocationId) return;

        setSubmitting(true);

        const locationId = Number(selectedLocationId);
        const currentLocQty = itemLocationStock[locationId] || 0;

        // 1. Update item_locations (Decrement)
        // Ensure we don't go below zero for that location
        const newLocQty = Math.max(0, currentLocQty - Number(consumeQty));

        const { error: locError } = await supabase
            .from('item_locations')
            .update({ quantity: newLocQty })
            .eq('item_id', selectedItem.id)
            .eq('location_id', locationId);

        if (locError) {
            alert('Error updating stock location. Please try again.');
            setSubmitting(false);
            return;
        }

        // 2. Update Total Stock on 'items' table (Legacy/Aggregate support)
        // We need to calculate the new total across ALL locations to be accurate
        // Or just decrement the total by the consumed amount
        const newTotal = Math.max(0, selectedItem.stock_quantity - Number(consumeQty));

        const { error: itemError } = await supabase
            .from('items')
            .update({ stock_quantity: newTotal })
            .eq('id', selectedItem.id);

        if (itemError) {
            console.error('Error updating total stock:', itemError);
        }

        // 3. Log to Audit Log
        const { data: { user } } = await supabase.auth.getUser();
        const changeType = reason === 'Wasted' || reason === 'Expired' || reason === 'Damaged' ? 'WASTE' : 'CONSUME';
        if (user) {
            await supabase
                .from('inventory_log')
                .insert({
                    item_id: selectedItem.id,
                    change_type: changeType,
                    quantity_change: -Number(consumeQty), // Negative for consumption
                    unit_cost_at_time: selectedItem.cost_per_unit || 0,
                    user_id: user.id,
                    notes: `${reason} from ${locations.find(l => l.id === locationId)?.name || 'Unknown Location'}`
                });
        }

        // 4. Update Local State (Optimistic UI update)
        setItems((prev) =>
            prev.map((i) => i.id === selectedItem.id ? { ...i, stock_quantity: newTotal } : i)
        );

        // 4. Close and Reset
        setSubmitting(false);
        handleCloseModal();
    };

    // --- Handle Barcode Scan ---
    const handleBarcodeScan = (barcode: string) => {
        setScanError('');

        // Find item by barcode
        const item = items.find((i) => i.barcode === barcode);

        if (item) {
            // Auto-select the item
            setSelectedItem(item);
            setConsumeQty(''); // Reset quantity
            setScannerOpen(false);
        } else {
            // Show error
            setScanError(`No item found with barcode: ${barcode}`);
            // Keep scanner open for retry
        }
    };

    return (
        <div className="space-y-6 max-w-4xl mx-auto pb-24"> {/* pb-24 for mobile nav clearance */}

            {/* --- Header & Search --- */}
            <div className="sticky top-0 bg-background z-10 pt-4 pb-4 space-y-4 px-4 md:px-0">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-orange-600 flex items-center gap-2">
                            <Utensils size={24} />
                            Log Consumption
                        </h1>
                        <p className="text-sm text-gray-500">Tap an item to remove from stock.</p>
                    </div>
                    <Link href="/" className="text-sm text-gray-500 hover:text-foreground flex items-center gap-1">
                        <ArrowLeft size={16} />
                        Back
                    </Link>
                </div>

                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="text-gray-400" size={20} />
                    </div>
                    <input
                        type="text"
                        placeholder="Search by name, category, or location..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-input bg-white focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none shadow-sm text-lg"
                    />
                </div>
            </div>

            {/* --- Results Grid --- */}
            <div className="px-4 md:px-0">
                {loading ? (
                    <div className="text-center py-12 text-gray-400">Loading inventory...</div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {filteredItems.length === 0 ? (
                            <div className="col-span-full text-center py-12 text-gray-500 bg-white rounded-xl border border-dashed border-gray-300">
                                <p>No items found for "{searchTerm}"</p>
                                <p className="text-sm mt-2">Try a different spelling.</p>
                            </div>
                        ) : (
                            filteredItems.map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => handleCardClick(item)}
                                    className="flex flex-col text-left bg-white p-4 rounded-xl border border-border shadow-sm hover:shadow-md active:scale-[0.98] transition-all"
                                >
                                    <div className="flex justify-between items-start w-full mb-2">
                                        <h3 className="font-semibold text-lg text-foreground line-clamp-1">{item.name}</h3>
                                        <span className={`text-xs font-bold px-2 py-1 rounded-full ${item.stock_quantity <= 5
                                            ? 'bg-red-100 text-red-700'
                                            : 'bg-green-100 text-green-700'
                                            }`}>
                                            {item.stock_quantity} {item.unit}
                                        </span>
                                    </div>

                                    <div className="flex justify-between items-end w-full mt-auto">
                                        <div className="text-sm text-gray-500 space-y-0.5">
                                            <p>{item.category}</p>
                                            {item.storage_location && <p className="text-xs">📍 {item.storage_location}</p>}
                                        </div>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                )}
            </div>

            {/* --- Floating Scan Button --- */}
            <button
                onClick={() => setScannerOpen(true)}
                className="fixed bottom-20 right-4 md:bottom-6 md:right-6 h-14 w-14 bg-orange-600 text-white rounded-full shadow-lg hover:shadow-xl active:scale-95 transition-all z-40 flex items-center justify-center"
                aria-label="Scan barcode"
            >
                <Camera size={24} />
            </button>

            {/* --- Scan Error Toast --- */}
            {scanError && (
                <div className="fixed bottom-36 left-4 right-4 md:bottom-24 md:left-auto md:right-24 md:max-w-md bg-red-500 text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 animate-in slide-in-from-bottom duration-300 z-50">
                    <AlertTriangle size={20} />
                    <p className="flex-1 text-sm font-medium">{scanError}</p>
                    <button
                        onClick={() => setScanError('')}
                        className="p-1 hover:bg-white/20 rounded transition-colors"
                    >
                        <AlertCircle size={18} />
                    </button>
                </div>
            )}

            {/* --- Consumption Modal --- */}
            {selectedItem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-background rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in duration-200">

                        <div className="bg-orange-50 p-6 border-b border-orange-100">
                            <h2 className="text-xl font-bold text-orange-900">Log Consumption</h2>
                            <p className="text-orange-700 mt-1">{selectedItem.name}</p>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-6">

                            {/* Current Stock Display */}
                            <div className="flex justify-between items-center bg-gray-50 p-3 rounded-lg">
                                <span className="text-sm text-gray-600">Total Stock:</span>
                                <span className="font-mono font-bold text-lg">{selectedItem.stock_quantity} {selectedItem.unit}</span>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Quantity to Remove
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        required
                                        autoFocus
                                        value={consumeQty}
                                        onChange={(e) => setConsumeQty(e.target.value === '' ? '' : Number(e.target.value))}
                                        className="w-full px-4 py-3 rounded-xl border border-input focus:ring-2 focus:ring-orange-500 outline-none text-lg"
                                        placeholder="0.00"
                                    />
                                </div>

                                {/* Location Selector */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Source Location
                                    </label>
                                    <select
                                        value={selectedLocationId}
                                        onChange={(e) => setSelectedLocationId(Number(e.target.value))}
                                        className="w-full px-4 py-3 rounded-xl border border-input focus:ring-2 focus:ring-orange-500 outline-none bg-white"
                                        required
                                    >
                                        <option value="" disabled>Select a location</option>
                                        {locations.map(loc => {
                                            const qty = itemLocationStock[loc.id] || 0;
                                            return (
                                                <option key={loc.id} value={loc.id}>
                                                    {loc.name} (Available: {qty})
                                                </option>
                                            );
                                        })}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Reason
                                    </label>
                                    <select
                                        value={reason}
                                        onChange={(e) => setReason(e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl border border-input focus:ring-2 focus:ring-orange-500 outline-none bg-white"
                                    >
                                        <option value="Consumed">Consumed (Used)</option>
                                        <option value="Wasted">Wasted (Spilled/Dropped)</option>
                                        <option value="Expired">Expired</option>
                                        <option value="Damaged">Damaged</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={handleCloseModal}
                                    className="flex-1 h-12 font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="flex-1 h-12 font-semibold text-white bg-orange-600 hover:bg-orange-700 rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {submitting ? 'Updating...' : (
                                        <>
                                            <Trash2 size={18} />
                                            Remove
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* --- Barcode Scanner --- */}
            <BarcodeScanner
                isOpen={scannerOpen}
                onClose={() => setScannerOpen(false)}
                onScanSuccess={handleBarcodeScan}
                title="Scan to Consume"
                subtitle="Scan item to remove from stock"
            />

        </div>
    );
}

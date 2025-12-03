'use client';

import { useState, useEffect, useMemo } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { Search, X, Check, DollarSign, AlertTriangle, Camera, ShoppingBag } from 'lucide-react';
import Link from 'next/link';
import BarcodeScanner from '@/components/BarcodeScanner';
import { processSale, type SaleEntry } from '@/lib/inventory-tracking';

// Define the shape of our inventory item
type Item = {
    id: number;
    name: string;
    category: string;
    stock_quantity: number;
    unit_of_measure: string;
    storage_location: string;
    barcode?: string;
    cost_per_unit?: number;
};

export default function ManualSalePage() {
    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // --- State ---
    const [items, setItems] = useState<Item[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // The item currently being "sold" (activates the modal)
    const [selectedItem, setSelectedItem] = useState<Item | null>(null);
    const [saleQty, setSaleQty] = useState<number | ''>('');
    const [unitPrice, setUnitPrice] = useState<number | ''>('');
    const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CARD' | 'OTHER'>('CARD');
    const [customerName, setCustomerName] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string>('');

    // Scanner state
    const [scannerOpen, setScannerOpen] = useState(false);
    const [scanError, setScanError] = useState<string>('');

    // --- Fetch Data on Mount ---
    useEffect(() => {
        const fetchData = async () => {
            const { data: itemsData, error: itemsError } = await supabase
                .from('items')
                .select('*')
                .order('name', { ascending: true });

            if (itemsError) console.error('Error fetching inventory:', itemsError);
            else setItems(itemsData || []);

            setLoading(false);
        };
        fetchData();
    }, [supabase]);

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
        setSaleQty('');
        // Default price: cost + 100% markup (customize as needed)
        const defaultPrice = item.cost_per_unit ? item.cost_per_unit * 2 : 0;
        setUnitPrice(defaultPrice);
        setPaymentMethod('CARD');
        setCustomerName('');
        setError('');
    };

    const handleCloseModal = () => {
        setSelectedItem(null);
        setSaleQty('');
        setUnitPrice('');
        setCustomerName('');
        setError('');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedItem || !saleQty || !unitPrice) return;

        setSubmitting(true);
        setError('');

        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            setError('You must be logged in to record a sale');
            setSubmitting(false);
            return;
        }

        // Process sale using the service
        const saleData: SaleEntry = {
            itemId: selectedItem.id,
            quantity: Number(saleQty),
            unitPrice: Number(unitPrice),
            source: 'MANUAL',
            paymentMethod,
            customerName: customerName || undefined,
            userId: user.id,
            notes: `Manual sale entry`
        };

        const result = await processSale(supabase, saleData);

        if (!result.success) {
            setError(result.error?.message || 'Failed to process sale');
            setSubmitting(false);
            return;
        }

        // Update local state (Optimistic UI update)
        const newStock = selectedItem.stock_quantity - Number(saleQty);
        setItems((prev) =>
            prev.map((i) => i.id === selectedItem.id ? { ...i, stock_quantity: newStock } : i)
        );

        // Close and Reset
        setSubmitting(false);
        handleCloseModal();
    };

    // --- Handle Barcode Scan ---
    const handleBarcodeScan = (barcode: string) => {
        setScanError('');

        // Find item by barcode
        const item = items.find((i) => i.barcode === barcode);

        if (item) {
            setSelectedItem(item);
            setSaleQty('');
            const defaultPrice = item.cost_per_unit ? item.cost_per_unit * 2 : 0;
            setUnitPrice(defaultPrice);
            setScannerOpen(false);
        } else {
            setScanError(`No item found with barcode: ${barcode}`);
        }
    };

    const totalAmount = saleQty && unitPrice ? Number(saleQty) * Number(unitPrice) : 0;

    return (
        <div className="space-y-6 max-w-4xl mx-auto pb-24">

            {/* --- Header & Search --- */}
            <div className="sticky top-0 bg-background z-10 pt-4 pb-4 space-y-4 px-4 md:px-0">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-primary flex items-center gap-2">
                            <ShoppingBag size={24} />
                            Manual Sale Entry
                        </h1>
                        <p className="text-sm text-gray-500">Tap an item to record a sale.</p>
                    </div>
                    <Link href="/" className="text-sm text-gray-500 hover:text-foreground">Cancel</Link>
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
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-input bg-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none shadow-sm text-lg"
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
                                            {item.stock_quantity} {item.unit_of_measure}
                                        </span>
                                    </div>

                                    <div className="flex justify-between items-end w-full mt-auto">
                                        <div className="text-sm text-gray-500 space-y-0.5">
                                            <p>{item.category}</p>
                                            {item.cost_per_unit && (
                                                <p className="text-xs font-medium text-primary">
                                                    Cost: ${item.cost_per_unit.toFixed(2)}
                                                </p>
                                            )}
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
                className="fixed bottom-20 right-4 md:bottom-6 md:right-6 h-14 w-14 bg-primary text-white rounded-full shadow-lg hover:shadow-xl active:scale-95 transition-all z-40 flex items-center justify-center"
                aria-label="Scan barcode"
            >
                <Camera size={24} />
            </button>

            {/* --- Barcode Scanner --- */}
            <BarcodeScanner
                isOpen={scannerOpen}
                onClose={() => {
                    setScannerOpen(false);
                    setScanError('');
                }}
                onScanSuccess={handleBarcodeScan}
                title="Scan Item Barcode"
                subtitle="Point camera at barcode to select item"
            />

            {/* --- Scan Error Toast --- */}
            {scanError && (
                <div className="fixed bottom-36 left-4 right-4 md:bottom-24 md:left-auto md:right-24 md:max-w-md bg-red-500 text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 animate-in slide-in-from-bottom duration-300 z-50">
                    <AlertTriangle size={20} />
                    <p className="flex-1 text-sm font-medium">{scanError}</p>
                    <button
                        onClick={() => setScanError('')}
                        className="p-1 hover:bg-white/20 rounded transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>
            )}

            {/* --- Sale Modal --- */}
            {selectedItem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-background rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in duration-200">
                        <div className="bg-primary/10 p-6 border-b border-border">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 bg-primary/20 rounded-lg">
                                    <DollarSign className="text-primary" size={24} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-foreground">{selectedItem.name}</h2>
                                    <p className="text-sm text-gray-600">Available: {selectedItem.stock_quantity} {selectedItem.unit_of_measure}</p>
                                </div>
                            </div>
                            <button onClick={handleCloseModal} className="absolute top-4 right-4 p-2 hover:bg-white/50 rounded-lg transition-colors text-gray-600 hover:text-foreground">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            {error && (
                                <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
                                    {error}
                                </div>
                            )}

                            <div className="relative">
                                <label htmlFor="saleQty" className="block text-sm font-medium text-gray-700 mb-1">
                                    Quantity
                                </label>
                                <input
                                    id="saleQty"
                                    type="number"
                                    value={saleQty}
                                    onChange={(e) => setSaleQty(e.target.value === '' ? '' : Number(e.target.value))}
                                    min="0"
                                    step="0.01"
                                    placeholder="Enter quantity"
                                    autoFocus
                                    required
                                    className="w-full px-4 py-3 rounded-xl border border-input bg-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none shadow-sm text-lg"
                                />
                            </div>

                            <div className="relative">
                                <label htmlFor="unitPrice" className="block text-sm font-medium text-gray-700 mb-1">
                                    Price per Unit
                                </label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                                    <input
                                        id="unitPrice"
                                        type="number"
                                        value={unitPrice}
                                        onChange={(e) => setUnitPrice(e.target.value === '' ? '' : Number(e.target.value))}
                                        min="0"
                                        step="0.01"
                                        placeholder="0.00"
                                        required
                                        className="w-full pl-8 pr-4 py-3 rounded-xl border border-input bg-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none shadow-sm text-lg"
                                    />
                                </div>
                            </div>

                            <div className="relative">
                                <label htmlFor="paymentMethod" className="block text-sm font-medium text-gray-700 mb-1">
                                    Payment Method
                                </label>
                                <select
                                    id="paymentMethod"
                                    value={paymentMethod}
                                    onChange={(e) => setPaymentMethod(e.target.value as 'CASH' | 'CARD' | 'OTHER')}
                                    className="w-full px-4 py-3 rounded-xl border border-input bg-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none shadow-sm text-lg appearance-none"
                                >
                                    <option value="CARD">Card</option>
                                    <option value="CASH">Cash</option>
                                    <option value="OTHER">Other</option>
                                </select>
                            </div>

                            <div className="relative">
                                <label htmlFor="customerName" className="block text-sm font-medium text-gray-700 mb-1">
                                    Customer Name (Optional)
                                </label>
                                <input
                                    id="customerName"
                                    type="text"
                                    value={customerName}
                                    onChange={(e) => setCustomerName(e.target.value)}
                                    placeholder="Enter customer name"
                                    className="w-full px-4 py-3 rounded-xl border border-input bg-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none shadow-sm text-lg"
                                />
                            </div>

                            {/* Total Display */}
                            {totalAmount > 0 && (
                                <div className="bg-green-50 border border-green-200 p-3 rounded-lg">
                                    <p className="text-sm text-green-700 font-medium">Total Sale Amount</p>
                                    <p className="text-2xl font-bold text-green-900">${totalAmount.toFixed(2)}</p>
                                </div>
                            )}

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
                                    className="flex-1 h-12 font-semibold text-white bg-primary hover:bg-primary/90 rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {submitting ? 'Processing...' : (
                                        <>
                                            <Check size={20} />
                                            Record Sale
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

        </div>
    );
}

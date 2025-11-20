'use client';

import { useState, useEffect, useMemo } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { Search, X, Check, PackageOpen, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

// Define the shape of our inventory item
type Item = {
  id: number;
  name: string;
  category: string;
  stock_quantity: number;
  unit_of_measure: string;
  storage_location: string;
  image_url?: string; // Optional: in case you add images later
};

export default function ReceiveStockPage() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // --- State ---
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // The item currently being "received" (activates the modal)
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [receiveQty, setReceiveQty] = useState<number | ''>('');
  const [submitting, setSubmitting] = useState(false);

  // --- Fetch Data on Mount ---
  useEffect(() => {
    const fetchInventory = async () => {
      const { data, error } = await supabase
        .from('items')
        .select('*')
        .order('name', { ascending: true });

      if (error) {
        console.error('Error fetching inventory:', error);
      } else {
        setItems(data || []);
      }
      setLoading(false);
    };
    fetchInventory();
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
    setReceiveQty(''); // Reset input
  };

  const handleCloseModal = () => {
    setSelectedItem(null);
    setReceiveQty('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem || !receiveQty) return;

    setSubmitting(true);

    // 1. Update Database
    const newTotal = selectedItem.stock_quantity + Number(receiveQty);

    const { error } = await supabase
      .from('items')
      .update({ stock_quantity: newTotal })
      .eq('id', selectedItem.id);

    if (error) {
      alert('Error updating stock. Please try again.');
      setSubmitting(false);
      return;
    }

    // 2. Update Local State (Optimistic UI update)
    setItems((prev) =>
      prev.map((i) => i.id === selectedItem.id ? { ...i, stock_quantity: newTotal } : i)
    );

    // 3. Close and Reset
    setSubmitting(false);
    handleCloseModal();
    // Optional: Toast notification could go here
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-24"> {/* pb-24 for mobile nav clearance */}

      {/* --- Header & Search --- */}
      <div className="sticky top-0 bg-background z-10 pt-4 pb-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-primary">Receive Stock</h1>
            <p className="text-sm text-gray-500">Tap an item to add inventory.</p>
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
      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading inventory...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredItems.length === 0 ? (
            <div className="col-span-full text-center py-12 text-gray-500 bg-white rounded-xl border border-dashed border-gray-300">
              <p>No items found for "{searchTerm}"</p>
              <p className="text-sm mt-2">Try a different spelling or add a new item.</p>
            </div>
          ) : (
            filteredItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleCardClick(item)}
                className="flex items-start text-left bg-white p-4 rounded-xl border border-border shadow-sm hover:shadow-md active:scale-[0.98] transition-all group"
              >
                {/* Icon Placeholder (Can be replaced by item.image_url) */}
                <div className="h-12 w-12 bg-secondary/30 rounded-lg flex items-center justify-center text-secondary-foreground mr-4 shrink-0">
                  <PackageOpen size={24} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                    <h3 className="font-semibold text-foreground truncate pr-2">{item.name}</h3>
                    <span className="text-xs font-medium bg-gray-100 text-gray-600 px-2 py-1 rounded-full whitespace-nowrap">
                      {item.stock_quantity} {item.unit_of_measure}
                    </span>
                  </div>

                  <div className="mt-1 flex items-center gap-2 text-sm text-gray-500">
                    <span className="truncate">{item.category}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1 truncate">
                      Location: {item.storage_location || 'N/A'}
                    </span>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      )}

      {/* --- Receiving Modal (Overlay) --- */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">

            {/* Modal Header */}
            <div className="bg-primary/10 p-6 flex justify-between items-start">
              <div>
                <h2 className="text-xl font-bold text-foreground">{selectedItem.name}</h2>
                <p className="text-primary font-medium text-sm mt-1">
                  Current: {selectedItem.stock_quantity} {selectedItem.unit_of_measure}
                </p>
              </div>
              <button onClick={handleCloseModal} className="p-2 bg-white/50 rounded-full hover:bg-white text-gray-600 transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-6">

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Quantity Received ({selectedItem.unit_of_measure})
                </label>
                <div className="relative">
                  <input
                    type="number"
                    inputMode="decimal" // Better keyboard on mobile
                    autoFocus
                    required
                    min="0.01"
                    step="any"
                    value={receiveQty}
                    onChange={(e) => setReceiveQty(e.target.value ? Number(e.target.value) : '')}
                    className="block w-full text-3xl font-bold text-center p-4 rounded-xl border border-input bg-gray-50 focus:ring-2 focus:ring-primary focus:bg-white outline-none transition-all"
                    placeholder="0"
                  />
                </div>
              </div>

              {/* Live Calculation Feedback */}
              {receiveQty !== '' && (
                <div className="bg-green-50 border border-green-100 p-3 rounded-lg flex items-center justify-center gap-2 text-green-800 text-sm font-medium">
                  <span>New Total:</span>
                  <span className="font-bold text-lg">
                    {selectedItem.stock_quantity + Number(receiveQty)} {selectedItem.unit_of_measure}
                  </span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="w-full py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !receiveQty}
                  className="w-full py-3 px-4 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {submitting ? 'Saving...' : (
                    <>
                      <Check size={20} />
                      Confirm
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
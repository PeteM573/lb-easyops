'use client';

import { useState, useEffect, useMemo } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { Search, X, Check, PackageOpen, AlertTriangle, Camera } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import BarcodeScanner from '@/components/BarcodeScanner';
import { formatQuantityWithUnit } from '@/lib/pluralize-unit';

// Define the shape of our inventory item
type Item = {
  id: number;
  name: string;
  category: string;
  stock_quantity: number;
  unit_of_measure: string;
  storage_location: string;
  barcode?: string;
  cost_per_unit?: number; // For audit logging
  image_url?: string; // Optional: in case you add images later
};

export default function ReceiveStockPage() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const router = useRouter();

  // --- State ---
  const [items, setItems] = useState<Item[]>([]);
  const [locations, setLocations] = useState<{ id: number; name: string; is_default: boolean }[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // The item currently being "received" (activates the modal)
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [receiveQty, setReceiveQty] = useState<number | ''>('');
  const [selectedLocationId, setSelectedLocationId] = useState<number | null>(null);
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
        .select('*')
        .order('id', { ascending: true });

      if (locError) {
        console.error('Error fetching locations:', locError);
      } else if (locData) {
        setLocations(locData);
        // Set default location
        const defaultLoc = locData.find(l => l.is_default);
        if (defaultLoc) setSelectedLocationId(defaultLoc.id);
        else if (locData.length > 0) setSelectedLocationId(locData[0].id);
      }

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
    setReceiveQty(''); // Reset input
  };

  const handleCloseModal = () => {
    setSelectedItem(null);
    setReceiveQty('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem || !receiveQty || !selectedLocationId) return;

    setSubmitting(true);

    // 1. Update item_locations (Upsert: Insert or Update)
    // We need to fetch current quantity at this location first, or rely on SQL upsert logic if we had a function.
    // Ideally, we'd use an RPC, but for now let's do a read-modify-write or simple upsert if we knew the current value.
    // Simpler approach: Get current qty at location -> Add new qty -> Update.

    const { data: currentLocData } = await supabase
      .from('item_locations')
      .select('quantity')
      .eq('item_id', selectedItem.id)
      .eq('location_id', selectedLocationId)
      .single();

    const currentQty = currentLocData?.quantity || 0;
    const newQty = currentQty + Number(receiveQty);

    const { error: locError } = await supabase
      .from('item_locations')
      .upsert({
        item_id: selectedItem.id,
        location_id: selectedLocationId,
        quantity: newQty
      }, { onConflict: 'item_id, location_id' });

    if (locError) {
      alert('Error updating stock location. Please try again.');
      setSubmitting(false);
      return;
    }

    // 2. Update Total Stock on 'items' table (Legacy/Aggregate support)
    // This keeps the main table in sync for quick viewing
    const newTotal = selectedItem.stock_quantity + Number(receiveQty);
    const { error: itemError } = await supabase
      .from('items')
      .update({ stock_quantity: newTotal })
      .eq('id', selectedItem.id);

    if (itemError) {
      console.error('Error updating total stock:', itemError);
      // Non-blocking error, but good to know
    }

    // 3. Log to Audit Log
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from('inventory_log')
        .insert({
          item_id: selectedItem.id,
          change_type: 'RECEIVE',
          quantity_change: Number(receiveQty),
          unit_cost_at_time: selectedItem.cost_per_unit || 0,
          user_id: user.id,
          notes: `Received at ${locations.find(l => l.id === selectedLocationId)?.name || 'Unknown Location'}`
        });
    }

    // 4. Update Local State (Optimistic UI update)
    setItems((prev) =>
      prev.map((i) => i.id === selectedItem.id ? { ...i, stock_quantity: newTotal } : i)
    );

    // 4. Close and Reset
    setSubmitting(false);
    handleCloseModal();
    // Optional: Toast notification could go here
  };

  // --- Handle Barcode Scan ---
  const handleBarcodeScan = (barcode: string) => {
    setScanError('');

    // Find item by barcode
    const item = items.find((i) => i.barcode === barcode);

    if (item) {
      // Auto-select the item
      setSelectedItem(item);
      setReceiveQty(''); // Reset quantity
      setScannerOpen(false);
    } else {
      // Item not found - redirect to new item workflow with barcode
      setScannerOpen(false);
      router.push(`/inventory/new?barcode=${encodeURIComponent(barcode)}`);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-24"> {/* pb-24 for mobile nav clearance */}

      {/* --- Header & Search --- */}
      <div className="sticky top-0 bg-background z-10 pt-4 pb-4 space-y-4 px-4 md:px-0">
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
      <div className="px-4 md:px-0">
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
                  className="flex flex-col text-left bg-white p-4 rounded-xl border border-border shadow-sm hover:shadow-md active:scale-[0.98] transition-all"
                >
                  <div className="flex justify-between items-start w-full mb-2">
                    <h3 className="font-semibold text-lg text-foreground line-clamp-1">{item.name}</h3>
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${item.stock_quantity <= 5
                      ? 'bg-red-100 text-red-700'
                      : 'bg-green-100 text-green-700'
                      }`}>
                      {formatQuantityWithUnit(item.stock_quantity, item.unit_of_measure)}
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

      {/* --- Receive Stock Modal --- */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-background rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in duration-200">
            <div className="bg-primary/10 p-6 border-b border-border">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-primary/20 rounded-lg">
                  <PackageOpen className="text-primary" size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-foreground">{selectedItem.name}</h2>
                  <p className="text-sm text-gray-600">Current Stock: {formatQuantityWithUnit(selectedItem.stock_quantity, selectedItem.unit_of_measure)}</p>
                </div>
              </div>
              <button onClick={handleCloseModal} className="absolute top-4 right-4 p-2 hover:bg-white/50 rounded-lg transition-colors text-gray-600 hover:text-foreground">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="relative">
                <label htmlFor="receiveQty" className="block text-sm font-medium text-gray-700 mb-1">
                  Quantity to Receive
                </label>
                <input
                  id="receiveQty"
                  type="number"
                  value={receiveQty}
                  onChange={(e) => setReceiveQty(e.target.value === '' ? '' : Number(e.target.value))}
                  min="0"
                  step="0.01"
                  placeholder="Enter quantity"
                  autoFocus
                  className="w-full px-4 py-3 rounded-xl border border-input bg-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none shadow-sm text-lg"
                />
              </div>

              <div className="relative">
                <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
                  Receive Location
                </label>
                <select
                  id="location"
                  value={selectedLocationId || ''}
                  onChange={(e) => setSelectedLocationId(Number(e.target.value))}
                  className="w-full px-4 py-3 rounded-xl border border-input bg-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none shadow-sm text-lg appearance-none"
                >
                  <option value="" disabled>Select a location</option>
                  {locations.map(loc => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name} {loc.is_default ? '(Default)' : ''}
                    </option>
                  ))}
                </select>
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
                  className="flex-1 h-12 font-semibold text-white bg-primary hover:bg-primary/90 rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submitting ? 'Updating...' : (
                    <>
                      <Check size={20} />
                      Add Stock
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
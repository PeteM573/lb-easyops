'use client';

import { useState, useEffect, useMemo } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, Download, Filter, AlertTriangle, Package, ArrowUpDown, Edit, ChevronLeft, ChevronRight, Info, Plus, CheckSquare, Square } from 'lucide-react';
import Link from 'next/link';
import { formatQuantityWithUnit } from '@/lib/pluralize-unit';

type ItemLocation = {
  location_name: string;
  quantity: number;
};

type Item = {
  id: number;
  name: string;
  category: string;
  stock_quantity: number;
  unit_of_measure: string;
  cost_per_unit: number;
  alert_threshold: number | null;
  storage_location: string | null;
  location_breakdown?: ItemLocation[];
  comparison_price: number | null;
  comparison_vendor: string | null;
};

const getCategoryColor = (category: string) => {
  const normalized = category.toLowerCase();
  if (normalized.includes('retail')) return 'bg-rose-100 text-rose-800 border-rose-200';
  if (normalized.includes('accessories')) return 'bg-blue-100 text-blue-800 border-blue-200';
  if (normalized.includes('raw')) return 'bg-green-100 text-green-800 border-green-200';
  if (normalized.includes('consumable')) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
  return 'bg-gray-100 text-gray-800 border-gray-200';
};

export default function InventoryReportPage() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [userRole, setUserRole] = useState<string>('staff');

  const searchParams = useSearchParams();

  // Check for URL filter params
  useEffect(() => {
    const filterParam = searchParams.get('filter');
    if (filterParam === 'low_stock') {
      setShowLowStockOnly(true);
    }
  }, [searchParams]);

  // --- Data Fetching ---
  useEffect(() => {
    const fetchItems = async () => {
      setLoading(true);

      // 1. Fetch Items
      const { data: itemsData, error: itemsError } = await supabase
        .from('items')
        .select('*')
        .order('name', { ascending: true });

      if (itemsError) {
        console.error('Error fetching items:', itemsError);
        setLoading(false);
        return;
      }

      // 2. Fetch Item Locations with Location Names
      const { data: locData, error: locError } = await supabase
        .from('item_locations')
        .select(`
          item_id,
          quantity,
          locations (name)
        `);

      if (locError) {
        console.error('Error fetching item locations:', locError);
      }

      // 3. Merge Data
      const mergedItems = itemsData?.map(item => {
        const breakdown = locData
          ?.filter((l: any) => l.item_id === item.id)
          .map((l: any) => ({
            location_name: l.locations?.name || 'Unknown',
            quantity: l.quantity
          })) || [];

        return { ...item, location_breakdown: breakdown };
      }) || [];

      setItems(mergedItems);
      setLoading(false);
    };

    const fetchUserRole = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();
        setUserRole(profile?.role || 'staff');
      }
    };

    fetchItems();
    fetchUserRole();
  }, [supabase]);

  // --- Computed Data ---
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.storage_location?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = categoryFilter === 'All' || item.category === categoryFilter;
      const matchesLowStock = !showLowStockOnly || (item.stock_quantity <= (item.alert_threshold || 0));

      return matchesSearch && matchesCategory && matchesLowStock;
    });
  }, [items, searchTerm, categoryFilter, showLowStockOnly]);

  const uniqueCategories = useMemo(() => {
    const cats = new Set(items.map(i => i.category).filter(Boolean));
    return ['All', ...Array.from(cats)];
  }, [items]);

  // --- Pagination ---
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedItems = filteredItems.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, categoryFilter, itemsPerPage]);

  // --- Export to CSV ---
  const handleExport = () => {
    const isManager = userRole.toLowerCase() === 'manager' || userRole.toLowerCase() === 'admin';

    // Define headers based on role
    const headers = ['Name', 'Category', 'Total Stock', 'UOM', 'Location Breakdown'];
    if (isManager) {
      headers.push('Cost');
      headers.push('Comparison Price');
      headers.push('Comparison Vendor');
    }

    const rows = filteredItems.map(item => {
      const breakdownStr = item.location_breakdown
        ?.map(l => `${l.location_name}: ${l.quantity}`)
        .join('; ') || '';

      const row = [
        item.name,
        item.category,
        item.stock_quantity,
        item.unit_of_measure,
        breakdownStr
      ];

      if (isManager) {
        row.push(item.cost_per_unit);
        row.push(item.comparison_price || '');
        row.push(item.comparison_vendor || '');
      }

      return row;
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')) // Quote cells to handle commas
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `loud-baby-inventory-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  // --- Helper for Stock Status ---
  const getStockStatus = (item: Item) => {
    if (item.alert_threshold && item.stock_quantity <= item.alert_threshold) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
          <AlertTriangle size={12} />
          Low Stock
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
        Good
      </span>
    );
  };

  // --- Helper for Savings Calculation ---
  const calculateSavings = (costPerUnit: number, comparisonPrice: number) => {
    return costPerUnit - comparisonPrice;
  };

  const renderSavingsCell = (item: Item) => {
    if (item.comparison_price) {
      const savings = calculateSavings(item.cost_per_unit, item.comparison_price);
      const savingsClass = savings > 0 ? 'text-green-600 font-medium' : savings < 0 ? 'text-red-600 font-medium' : 'text-gray-600';

      return (
        <div className="text-xs space-y-1">
          <div className="font-bold text-gray-800">${item.comparison_price.toFixed(2)}</div>
          <div className="text-gray-500 text-[10px]">({item.comparison_vendor})</div>
          <div className={savingsClass}>
            {savings > 0 ? '+' : ''}{savings.toFixed(2)} {savings >= 0 ? 'Saved' : 'Loss'} / {formatQuantityWithUnit(1, item.unit_of_measure).split(' ')[1]}
          </div>
        </div>
      );
    }
    return (
      <Link
        href={`/inventory/edit?id=${item.id}`}
        className="text-xs text-blue-600 hover:text-blue-800 underline"
      >
        Set Comparison (P1)
      </Link>
    );
  };

  return (
    <div className="space-y-6 pb-20">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary">Inventory Report</h1>
          <p className="text-sm text-gray-500">View and export current stock levels.</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/inventory/new"
            className="flex items-center justify-center gap-2 bg-primary text-white px-4 py-2 rounded-xl hover:bg-primary/90 transition-colors shadow-sm font-medium"
          >
            <Plus size={18} />
            Add Item
          </Link>
          <button
            onClick={handleExport}
            className="flex items-center justify-center gap-2 bg-white border border-border text-foreground px-4 py-2 rounded-xl hover:bg-gray-50 transition-colors shadow-sm font-medium"
          >
            <Download size={18} />
            Export CSV
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl border border-border shadow-sm flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search items..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-input focus:ring-2 focus:ring-primary outline-none"
          />
        </div>
        <div className="relative w-full md:w-48">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full pl-10 pr-8 py-2 rounded-lg border border-input focus:ring-2 focus:ring-primary outline-none appearance-none bg-white cursor-pointer"
          >
            {uniqueCategories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        {/* Low Stock Toggle */}
        <button
          onClick={() => setShowLowStockOnly(!showLowStockOnly)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${showLowStockOnly
            ? 'bg-amber-50 border-amber-200 text-amber-700'
            : 'bg-white border-input text-gray-600 hover:bg-gray-50'
            }`}
        >
          {showLowStockOnly ? <CheckSquare size={20} /> : <Square size={20} />}
          <span className="font-medium">Low Stock Only</span>
        </button>
      </div>

      {/* Data Display */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading report...</div>
      ) : (
        <>
          {/* Mobile View: Cards */}
          <div className="md:hidden space-y-4">
            {paginatedItems.map((item) => (
              <div key={item.id} className="bg-white p-4 rounded-xl border border-border shadow-sm">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-foreground">{item.name}</h3>
                    {getStockStatus(item)}
                  </div>
                  <Link
                    href={`/inventory/edit?id=${item.id}`}
                    className="p-2 text-gray-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                    aria-label="Edit item"
                  >
                    <Edit size={18} />
                  </Link>
                </div>
                <div className="flex justify-between items-end">
                  <div className="space-y-1">
                    <span className={`px-2 py-1 rounded-md text-xs font-medium border whitespace-nowrap ${getCategoryColor(item.category)}`}>
                      {item.category}
                    </span>
                    {/* Breakdown for Mobile */}
                    <div className="text-xs text-gray-400 space-y-0.5">
                      {item.location_breakdown?.map((loc, idx) => (
                        <p key={idx}>{loc.location_name}: {loc.quantity}</p>
                      ))}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-primary">
                      {formatQuantityWithUnit(item.stock_quantity, item.unit_of_measure)}
                    </p>
                    {/* Vendor Comparison for Mobile (Manager Only) */}
                    {(userRole.toLowerCase() === 'manager' || userRole.toLowerCase() === 'admin') && item.comparison_price && (
                      <div className="mt-2 text-xs text-gray-500">
                        <div className="font-medium">vs ${item.comparison_price.toFixed(2)}</div>
                        <div>({item.comparison_vendor})</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop View: Table */}
          <div className="hidden md:block bg-white rounded-xl border border-border shadow-sm overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-600 border-b border-border">
                <tr>
                  <th className="px-6 py-4 font-medium">Item Name</th>
                  <th className="px-6 py-4 font-medium">Category</th>
                  <th className="px-6 py-4 font-medium">Location Breakdown</th>
                  <th className="px-6 py-4 font-medium">Location Breakdown</th>
                  {(userRole.toLowerCase() === 'manager' || userRole.toLowerCase() === 'admin') && (
                    <>
                      <th className="px-6 py-4 font-medium text-right">Cost</th>
                      <th className="px-6 py-4 font-medium">Best Price & Savings</th>
                    </>
                  )}
                  <th className="px-6 py-4 font-medium text-right">Total Qty</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paginatedItems.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-foreground">{item.name}</td>
                    <td className="px-6 py-4 text-gray-500">
                      <span className={`px-2 py-1 rounded-md text-xs font-medium border whitespace-nowrap ${getCategoryColor(item.category)}`}>
                        {item.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-500 text-xs">
                      {item.location_breakdown && item.location_breakdown.length > 0 ? (
                        <div className="space-y-1">
                          {item.location_breakdown.map((loc, idx) => (
                            <div key={idx} className="flex justify-between max-w-[150px]">
                              <span>{loc.location_name}:</span>
                              <span className="font-medium text-gray-700">{loc.quantity}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-400 italic">No location data</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-foreground">
                      {formatQuantityWithUnit(item.stock_quantity, item.unit_of_measure)}
                    </td>
                    {(userRole.toLowerCase() === 'manager' || userRole.toLowerCase() === 'admin') && (
                      <>
                        <td className="px-6 py-4 text-right font-mono text-gray-600">${item.cost_per_unit}</td>
                        <td className="px-6 py-4">
                          {renderSavingsCell(item)}
                        </td>
                      </>
                    )}
                    <td className="px-6 py-4">
                      {getStockStatus(item)}
                    </td>
                    <td className="px-6 py-4">
                      <Link
                        href={`/inventory/edit?id=${item.id}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                        aria-label="Edit item"
                      >
                        <Edit size={16} />
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredItems.length === 0 && (
            <div className="text-center py-12 text-gray-500 bg-white rounded-xl border border-dashed border-gray-300">
              No items match your filters.
            </div>
          )}

          {/* Pagination Controls */}
          {filteredItems.length > 0 && (
            <div className="bg-white rounded-xl border border-border shadow-sm p-4">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">

                {/* Items per page selector */}
                <div className="flex items-center gap-3">
                  <label htmlFor="itemsPerPage" className="text-sm text-gray-600">
                    Items per page:
                  </label>
                  <select
                    id="itemsPerPage"
                    value={itemsPerPage}
                    onChange={(e) => setItemsPerPage(Number(e.target.value))}
                    className="h-10 px-3 rounded-lg border border-input bg-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-sm"
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>

                {/* Page info and navigation */}
                <div className="flex items-center justify-between md:justify-end gap-4">
                  <p className="text-sm text-gray-600">
                    Showing {startIndex + 1}-{Math.min(endIndex, filteredItems.length)} of {filteredItems.length}
                  </p>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="h-10 px-3 rounded-lg border border-input bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
                      aria-label="Previous page"
                    >
                      <ChevronLeft size={18} />
                      <span className="hidden sm:inline text-sm">Previous</span>
                    </button>

                    <span className="text-sm text-gray-600 px-2">
                      Page {currentPage} of {totalPages}
                    </span>

                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="h-10 px-3 rounded-lg border border-input bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
                      aria-label="Next page"
                    >
                      <span className="hidden sm:inline text-sm">Next</span>
                      <ChevronRight size={18} />
                    </button>
                  </div>
                </div>

              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
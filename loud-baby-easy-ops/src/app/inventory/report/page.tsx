'use client';

import { useState, useEffect, useMemo } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Search, Download, Filter, AlertTriangle, Package, ArrowUpDown } from 'lucide-react';

type Item = {
  id: number;
  name: string;
  category: string;
  stock_quantity: number;
  unit_of_measure: string;
  cost_per_unit: number;
  alert_threshold: number | null;
  storage_location: string | null;
};

export default function InventoryReportPage() {
  const supabase = createClientComponentClient();
  
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');

  // --- Data Fetching ---
  useEffect(() => {
    const fetchItems = async () => {
      const { data, error } = await supabase
        .from('items')
        .select('*')
        .order('name', { ascending: true });
      
      if (!error && data) {
        setItems(data);
      }
      setLoading(false);
    };
    fetchItems();
  }, [supabase]);

  // --- Computed Data ---
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            item.storage_location?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = categoryFilter === 'All' || item.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [items, searchTerm, categoryFilter]);

  const uniqueCategories = useMemo(() => {
    const cats = new Set(items.map(i => i.category).filter(Boolean));
    return ['All', ...Array.from(cats)];
  }, [items]);

  // --- Export to CSV ---
  const handleExport = () => {
    const headers = ['Name', 'Category', 'Stock', 'UOM', 'Cost', 'Location'];
    const rows = filteredItems.map(item => [
      item.name,
      item.category,
      item.stock_quantity,
      item.unit_of_measure,
      item.cost_per_unit,
      item.storage_location
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
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

  return (
    <div className="space-y-6 pb-20">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary">Inventory Report</h1>
          <p className="text-sm text-gray-500">View and export current stock levels.</p>
        </div>
        <button 
          onClick={handleExport}
          className="flex items-center justify-center gap-2 bg-white border border-border text-foreground px-4 py-2 rounded-xl hover:bg-gray-50 transition-colors shadow-sm font-medium"
        >
          <Download size={18} />
          Export CSV
        </button>
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
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <select 
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full pl-10 pr-8 py-2 rounded-lg border border-input focus:ring-2 focus:ring-primary outline-none appearance-none bg-white"
            >
                {uniqueCategories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                ))}
            </select>
        </div>
      </div>

      {/* Data Display */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading report...</div>
      ) : (
        <>
          {/* Mobile View: Cards */}
          <div className="md:hidden space-y-4">
            {filteredItems.map((item) => (
                <div key={item.id} className="bg-white p-4 rounded-xl border border-border shadow-sm flex justify-between items-start">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-foreground">{item.name}</h3>
                            {getStockStatus(item)}
                        </div>
                        <p className="text-sm text-gray-500">{item.category} • {item.storage_location || 'No Loc'}</p>
                        <p className="text-xs text-gray-400">Cost: ${item.cost_per_unit}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-xl font-bold text-primary">{item.stock_quantity}</p>
                        <p className="text-xs text-gray-500">{item.unit_of_measure}</p>
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
                        <th className="px-6 py-4 font-medium">Location</th>
                        <th className="px-6 py-4 font-medium text-right">Cost</th>
                        <th className="px-6 py-4 font-medium text-right">Quantity</th>
                        <th className="px-6 py-4 font-medium">Status</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-border">
                    {filteredItems.map((item) => (
                        <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-6 py-4 font-medium text-foreground">{item.name}</td>
                            <td className="px-6 py-4 text-gray-500">
                                <span className="bg-gray-100 px-2 py-1 rounded-md text-xs">{item.category}</span>
                            </td>
                            <td className="px-6 py-4 text-gray-500">{item.storage_location || '-'}</td>
                            <td className="px-6 py-4 text-right font-mono text-gray-600">${item.cost_per_unit}</td>
                            <td className="px-6 py-4 text-right font-bold text-foreground">
                                {item.stock_quantity} <span className="text-gray-400 font-normal text-xs">{item.unit_of_measure}</span>
                            </td>
                            <td className="px-6 py-4">
                                {getStockStatus(item)}
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
        </>
      )}
    </div>
  );
}
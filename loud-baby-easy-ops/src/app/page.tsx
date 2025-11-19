// src/app/page.tsx
import Link from 'next/link';
import { PackagePlus, Search, Truck, AlertCircle } from 'lucide-react';

// Mock data for layout visualization (Replace with your real DB calls later)
const lowStockCount = 3; 
const tasksDue = 2;

export default function Dashboard() {
  return (
    <div className="space-y-6">
      
      {/* 1. Header Section */}
      <section className="space-y-1">
        <h2 className="text-2xl font-bold text-foreground">Good Morning! ☕</h2>
        <p className="text-gray-500">Here is what is happening at Loud Baby today.</p>
      </section>

      {/* 2. Critical Alerts (Only show if needed) */}
      {(lowStockCount > 0 || tasksDue > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {lowStockCount > 0 && (
                 <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl flex items-center gap-4">
                    <div className="p-3 bg-amber-100 text-amber-700 rounded-full">
                        <AlertCircle size={24} />
                    </div>
                    <div>
                        <p className="font-bold text-amber-900">{lowStockCount} Items Low Stock</p>
                        <p className="text-sm text-amber-700">Check inventory report</p>
                    </div>
                 </div>
            )}
        </div>
      )}

      {/* 3. Quick Actions - The "Buffet" */}
      <section>
        <h3 className="text-lg font-semibold mb-3">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            
            {/* Receive Stock */}
            <Link href="/inventory/receive" className="group bg-white p-6 rounded-xl border border-border shadow-sm hover:shadow-md transition-all flex flex-col items-center text-center gap-3">
                <div className="p-4 bg-primary/10 text-primary rounded-full group-hover:scale-110 transition-transform">
                    <Truck size={28} />
                </div>
                <span className="font-medium text-foreground">Receive Stock</span>
            </Link>

            {/* Scan Item */}
            <Link href="/inventory/scan" className="group bg-white p-6 rounded-xl border border-border shadow-sm hover:shadow-md transition-all flex flex-col items-center text-center gap-3">
                <div className="p-4 bg-secondary text-secondary-foreground rounded-full group-hover:scale-110 transition-transform">
                    <Search size={28} />
                </div>
                <span className="font-medium text-foreground">Lookup / Scan</span>
            </Link>

             {/* Add Item (Manager) */}
             <Link href="/inventory/new" className="group bg-white p-6 rounded-xl border border-border shadow-sm hover:shadow-md transition-all flex flex-col items-center text-center gap-3">
                <div className="p-4 bg-gray-100 text-gray-600 rounded-full group-hover:scale-110 transition-transform">
                    <PackagePlus size={28} />
                </div>
                <span className="font-medium text-foreground">New Item</span>
            </Link>

        </div>
      </section>

      {/* 4. Your Tasks Section */}
      <section className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border flex justify-between items-center">
            <h3 className="font-semibold">My Tasks</h3>
            <span className="text-xs bg-gray-100 px-2 py-1 rounded-full text-gray-600">2 Pending</span>
        </div>
        <div className="divide-y divide-border">
            {/* Example Task Rows */}
            <div className="p-4 flex items-center gap-3 hover:bg-gray-50">
                <input type="checkbox" className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary" />
                <div className="flex-1">
                    <p className="text-sm font-medium">Morning Temp Check</p>
                    <p className="text-xs text-gray-500">Assigned by Pete</p>
                </div>
            </div>
            <div className="p-4 flex items-center gap-3 hover:bg-gray-50">
                <input type="checkbox" className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary" />
                <div className="flex-1">
                    <p className="text-sm font-medium">Receive Milk Delivery</p>
                    <p className="text-xs text-gray-500">Assigned by System</p>
                </div>
            </div>
        </div>
      </section>

    </div>
  );
}
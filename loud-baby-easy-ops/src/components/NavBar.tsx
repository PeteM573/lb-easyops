// src/components/NavBar.tsx
'use client';

import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function NavBar() {
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <nav className="bg-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-8">
            <Link href="/" className="text-2xl font-bold text-gray-800">Loud Baby</Link>
            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-4">
                {/* Add a link to the new Tasks page */}
                <Link href="/tasks" className="text-gray-500 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium">Tasks</Link>
                {/* Add a link to the new Report page */}
                <Link href="/inventory/report" className="text-gray-500 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium">Inventory Report</Link>
                {/* Scan link */}
                 <Link href="/inventory/scan" className="block w-full text-center bg-gray-700 hover:bg-gray-800 text-white font-bold py-3 px-4 rounded-lg transition duration-300">Scan Item</Link>
              </div>
            </div>
          </div>
          <div>
            <button
              onClick={handleLogout}
              className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg text-sm"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
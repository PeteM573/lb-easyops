// src/components/NavBar.tsx
'use client';

import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState, useEffect } from 'react';

export default function NavBar() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const router = useRouter();
  const [userRole, setUserRole] = useState<string>('');
  const [userId, setUserId] = useState<string | null>(null);

  // Get user role and set up realtime subscription
  useEffect(() => {
    const fetchRole = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);

        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        if (profile) {
          setUserRole(profile.role || '');
        }
      }
    };
    fetchRole();
  }, [supabase]);

  // Subscribe to role changes
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel('profile-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${userId}`
        },
        (payload) => {
          console.log('Role updated:', payload.new);
          setUserRole(payload.new.role || '');
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const isManager = userRole.toLowerCase() === 'manager' || userRole.toLowerCase() === 'admin';

  return (
    <nav className="bg-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-8">
            <Link href="/" className="text-2xl font-bold text-gray-800">Loud Baby</Link>
            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-4">
                {/* Receive Stock */}
                <Link href="/inventory/receive" className="text-green-600 hover:text-green-700 px-3 py-2 rounded-md text-sm font-medium">Receive Stock</Link>
                {/* Add a link to the new Tasks page */}
                <Link href="/tasks" className="text-gray-500 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium">Tasks</Link>
                {/* Add a link to the new Report page */}
                <Link href="/inventory/report" className="text-gray-500 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium">Inventory Report</Link>
                {/* Scan link */}
                <Link href="/inventory/scan" className="block w-full text-center bg-gray-700 hover:bg-gray-800 text-white font-bold py-3 px-4 rounded-lg transition duration-300">Scan Item</Link>
                {/* Locations link */}
                <Link href="/inventory/locations" className="text-gray-500 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium">Locations</Link>
                {/* Manager-only: User Management */}
                {isManager && (
                  <Link href="/admin/users" className="text-purple-600 hover:text-purple-700 px-3 py-2 rounded-md text-sm font-medium">Manage Users</Link>
                )}
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
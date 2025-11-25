// src/components/AppShell.tsx
'use client'

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Package, ScanBarcode, ClipboardList, Menu, LogOut } from 'lucide-react';
import { useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const navItems = [
    { name: 'Overview', href: '/', icon: LayoutDashboard },
    { name: 'Inventory', href: '/inventory/report', icon: Package },
    { name: 'Scan', href: '/inventory/scan', icon: ScanBarcode },
    { name: 'Tasks', href: '/tasks', icon: ClipboardList },
  ];

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.refresh();
    router.push('/login');
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* --- Desktop Sidebar --- */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-border h-screen sticky top-0">
        <div className="p-6 border-b border-border">
          {/* Placeholder for Logo */}
          <h1 className="text-2xl font-bold text-primary tracking-tight">Loud Baby</h1>
          <p className="text-xs text-muted-foreground">Easy Ops</p>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-gray-600 hover:bg-gray-50'
                  }`}
              >
                <Icon size={20} />
                {item.name}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-border">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 w-full text-gray-600 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"
          >
            <LogOut size={20} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* --- Mobile Header --- */}
      <header className="md:hidden h-16 bg-white border-b border-border flex items-center justify-between px-4 sticky top-0 z-10">
        <h1 className="text-xl font-bold text-primary">Loud Baby</h1>
        <button onClick={handleLogout} className="p-2 text-gray-500">
          <LogOut size={20} />
        </button>
      </header>

      {/* --- Main Content Area --- */}
      <main className="flex-1 bg-background p-4 md:p-8 mb-20 md:mb-0 overflow-y-auto">
        <div className="max-w-5xl mx-auto">
          {children}
        </div>
      </main>

      {/* --- Mobile Bottom Navigation --- */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-border h-20 z-20 pb-safe">
        <div className="grid grid-cols-4 h-full">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex flex-col items-center justify-center gap-1 ${isActive ? 'text-primary' : 'text-gray-400'
                  }`}
              >
                <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
                <span className="text-[10px] font-medium">{item.name}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
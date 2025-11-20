// src/app/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import Link from 'next/link';
import { PackagePlus, Search, Truck, AlertCircle, Circle, CheckCircle2 } from 'lucide-react';

interface Task {
    id: number;
    title: string;
    is_complete: boolean;
    assigned_to: string | null;
    profiles: { full_name: string }[] | null;
}

export default function Dashboard() {
    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const [tasks, setTasks] = useState<Task[]>([]);
    const [userId, setUserId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTasks = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setUserId(user.id);

                const { data } = await supabase
                    .from('tasks')
                    .select(`
            id,
            title,
            is_complete,
            assigned_to,
            profiles:assigned_to ( full_name )
          `)
                    .eq('assigned_to', user.id)
                    .eq('is_complete', false)
                    .order('created_at', { ascending: false })
                    .limit(5);

                setTasks(data || []);
            }
            setLoading(false);
        };

        fetchTasks();
    }, [supabase]);

    const handleToggleTask = async (taskId: number, currentStatus: boolean) => {
        const { error } = await supabase
            .from('tasks')
            .update({ is_complete: !currentStatus })
            .eq('id', taskId);

        if (!error) {
            // Remove completed task from list
            setTasks(tasks.filter(t => t.id !== taskId));
        }
    };

    // Mock data for low stock (will be replaced with real data later)
    const lowStockCount = 0;

    return (
        <div className="space-y-6">

            {/* 1. Header Section */}
            <section className="space-y-1">
                <h2 className="text-2xl font-bold text-foreground">Good Morning! ☕</h2>
                <p className="text-gray-500">Here is what is happening at Loud Baby today.</p>
            </section>

            {/* 2. Critical Alerts (Only show if needed) */}
            {(lowStockCount > 0 || tasks.length > 0) && (
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
                    <div className="flex items-center gap-2">
                        <span className="text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-full font-medium">
                            {tasks.length} Pending
                        </span>
                        <Link href="/tasks" className="text-xs text-gray-500 hover:text-primary transition-colors">
                            View All →
                        </Link>
                    </div>
                </div>
                <div className="divide-y divide-border">
                    {loading ? (
                        <div className="p-8 text-center text-gray-500">
                            <p className="text-sm">Loading tasks...</p>
                        </div>
                    ) : tasks.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                            <Circle size={48} className="mx-auto mb-3 text-gray-300" />
                            <p className="font-medium">No pending tasks</p>
                            <p className="text-sm mt-1">All caught up! 🎉</p>
                        </div>
                    ) : (
                        tasks.map(task => (
                            <div key={task.id} className="p-4 flex items-center gap-3 hover:bg-gray-50 transition-colors">
                                <button
                                    onClick={() => handleToggleTask(task.id, task.is_complete)}
                                    className="text-gray-400 hover:text-primary transition-colors"
                                >
                                    <Circle size={20} />
                                </button>
                                <div className="flex-1">
                                    <p className="text-sm font-medium">{task.title}</p>
                                    <p className="text-xs text-gray-500">
                                        {task.profiles?.[0]?.full_name ? `Assigned by ${task.profiles[0].full_name}` : 'Unassigned'}
                                    </p>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </section>

        </div>
    );
}
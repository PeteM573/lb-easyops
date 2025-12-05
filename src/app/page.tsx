'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import Link from 'next/link';
import { PackagePlus, Search, Truck, AlertCircle, Circle, CheckCircle2, Utensils, Calendar, Plus, Trash2, X, TrendingUp, DollarSign, Package, Activity, ShoppingBag } from 'lucide-react';
import { getDashboardMetrics, formatCurrency, formatPercentage, type DashboardMetrics } from '@/lib/analytics';
import { getRecentActivity } from '@/lib/inventory-tracking';

interface Task {
    id: number;
    title: string;
    is_complete: boolean;
    assigned_to: string | null;
    profiles: { full_name: string }[] | null;
}

interface UpcomingDate {
    id: number;
    label: string;
    target_date: string;
    items: { name: string } | null;
    type: 'item' | 'general';
}

export default function Dashboard() {
    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const [tasks, setTasks] = useState<Task[]>([]);
    const [userId, setUserId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    // Manager-only state
    const [userRole, setUserRole] = useState<string>('staff');
    const [upcomingDates, setUpcomingDates] = useState<UpcomingDate[]>([]);
    const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
    const [recentActivity, setRecentActivity] = useState<any[]>([]);

    // General Dates Management
    const [showGeneralDatesModal, setShowGeneralDatesModal] = useState(false);
    const [generalLabel, setGeneralLabel] = useState('');
    const [generalDate, setGeneralDate] = useState('');
    const [generalDatesList, setGeneralDatesList] = useState<any[]>([]);

    useEffect(() => {
        const fetchTasks = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setUserId(user.id);

                // Fetch User Role
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', user.id)
                    .single();
                const role = profile?.role || 'staff';
                setUserRole(role);

                // Fetch Tasks
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

                // Fetch Manager-Only Data
                const isManager = role.toLowerCase() === 'manager' || role.toLowerCase() === 'admin';

                if (isManager) {
                    // Fetch Upcoming Dates
                    const today = new Date();
                    const nextWeek = new Date();
                    nextWeek.setDate(today.getDate() + 7);
                    const nextWeekStr = nextWeek.toISOString().split('T')[0];

                    // 1. Item Dates
                    const { data: itemDates } = await supabase
                        .from('item_dates')
                        .select(`
                            id,
                            label,
                            target_date,
                            items ( name )
                        `)
                        .lte('target_date', nextWeekStr)
                        .order('target_date', { ascending: true })
                        .limit(5);

                    // 2. General Dates
                    const { data: generalDates } = await supabase
                        .from('general_dates')
                        .select('*')
                        .lte('target_date', nextWeekStr)
                        .order('target_date', { ascending: true })
                        .limit(5);

                    // Combine and Sort
                    const combined = [
                        ...(itemDates || []).map(d => ({ ...d, type: 'item' })),
                        ...(generalDates || []).map(d => ({ ...d, type: 'general', items: null }))
                    ].sort((a: any, b: any) => new Date(a.target_date).getTime() - new Date(b.target_date).getTime())
                        .slice(0, 5);

                    setUpcomingDates(combined as any);

                    // Fetch Dashboard Metrics
                    try {
                        const dashboardMetrics = await getDashboardMetrics(supabase);
                        setMetrics(dashboardMetrics);
                    } catch (error) {
                        console.error('Error fetching dashboard metrics:', error);
                    }

                    // Fetch Recent Activity
                    try {
                        const activity = await getRecentActivity(supabase, 10);
                        setRecentActivity(activity);
                    } catch (error) {
                        console.error('Error fetching recent activity:', error);
                    }
                }
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

    // General Dates Functions
    const fetchGeneralDates = async () => {
        const { data } = await supabase
            .from('general_dates')
            .select('*')
            .order('target_date', { ascending: true });
        setGeneralDatesList(data || []);
    };

    const handleAddGeneralDate = async () => {
        if (!generalLabel || !generalDate) return;

        const { error } = await supabase
            .from('general_dates')
            .insert([{
                label: generalLabel,
                target_date: generalDate,
                notify_manager: true
            }]);

        if (!error) {
            setGeneralLabel('');
            setGeneralDate('');
            fetchGeneralDates();
        }
    };

    const handleDeleteGeneralDate = async (id: number) => {
        await supabase.from('general_dates').delete().eq('id', id);
        fetchGeneralDates();
    };

    const openGeneralDatesModal = () => {
        fetchGeneralDates();
        setShowGeneralDatesModal(true);
    };

    // Mock data for low stock (will be replaced with real data later)
    const lowStockCount = metrics?.lowStockCount || 0;
    const isManager = userRole.toLowerCase() === 'manager' || userRole.toLowerCase() === 'admin';

    return (
        <div className="space-y-6">

            {/* 1. Header Section */}
            <section className="space-y-1">
                <h2 className="text-2xl font-bold text-foreground">Good Morning! ☕</h2>
                <p className="text-gray-500">Here is what is happening at Loud Baby today.</p>
            </section>

            {/* 2. Manager-Only Metrics */}
            {isManager && metrics && (
                <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Inventory Value */}
                    <div className="bg-white p-4 rounded-xl border border-border shadow-sm">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                                <Package size={20} />
                            </div>
                            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Inventory Value</p>
                        </div>
                        <p className="text-2xl font-bold text-foreground">{formatCurrency(metrics.inventoryValue)}</p>
                    </div>

                    {/* Monthly COGS */}
                    <div className="bg-white p-4 rounded-xl border border-border shadow-sm">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-amber-100 text-amber-600 rounded-lg">
                                <TrendingUp size={20} />
                            </div>
                            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Monthly COGS</p>
                        </div>
                        <p className="text-2xl font-bold text-foreground">{formatCurrency(metrics.monthlyCOGS)}</p>
                    </div>

                    {/* Gross Profit */}
                    <div className="bg-white p-4 rounded-xl border border-border shadow-sm">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-green-100 text-green-600 rounded-lg">
                                <DollarSign size={20} />
                            </div>
                            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Gross Profit</p>
                        </div>
                        <p className="text-2xl font-bold text-foreground">{formatCurrency(metrics.monthlyGrossProfit)}</p>
                        <p className="text-xs text-gray-500 mt-1">
                            {metrics.monthlyRevenue > 0
                                ? formatPercentage((metrics.monthlyGrossProfit / metrics.monthlyRevenue) * 100)
                                : '0%'} margin
                        </p>
                    </div>

                    {/* Sales Today */}
                    <div className="bg-white p-4 rounded-xl border border-border shadow-sm">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-primary/10 text-primary rounded-lg">
                                <Activity size={20} />
                            </div>
                            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Sales Today</p>
                        </div>
                        <p className="text-2xl font-bold text-foreground">{formatCurrency(metrics.salesToday.revenue)}</p>
                        <p className="text-xs text-gray-500 mt-1">{metrics.salesToday.count} transaction{metrics.salesToday.count !== 1 ? 's' : ''}</p>
                    </div>
                </section>
            )}

            {/* 3. Critical Alerts (Only show if needed) */}
            {(lowStockCount > 0 || tasks.length > 0 || upcomingDates.length > 0) && (
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

                    {/* Upcoming Dates Alert (Manager Only) */}
                    {upcomingDates.length > 0 && (
                        <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex items-center gap-4">
                            <div className="p-3 bg-blue-100 text-blue-700 rounded-full">
                                <Calendar size={24} />
                            </div>
                            <div className="flex-1">
                                <p className="font-bold text-blue-900">{upcomingDates.length} Upcoming Dates</p>
                                <div className="text-sm text-blue-700">
                                    {upcomingDates.slice(0, 2).map((d, i) => (
                                        <div key={d.id} className="truncate">
                                            {d.type === 'item' ? (
                                                <span>{d.label}: {d.items?.name}</span>
                                            ) : (
                                                <span className="font-medium text-blue-800">{d.label}</span>
                                            )}
                                            <span className="text-blue-600 ml-1">({new Date(d.target_date).toLocaleDateString()})</span>
                                        </div>
                                    ))}
                                    {upcomingDates.length > 2 && (
                                        <div className="text-xs opacity-75">+{upcomingDates.length - 2} more</div>
                                    )}
                                </div>
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

                    {/* Log Consumption */}
                    <Link href="/inventory/consume" className="group bg-white p-6 rounded-xl border border-border shadow-sm hover:shadow-md transition-all flex flex-col items-center text-center gap-3">
                        <div className="p-4 bg-orange-100 text-orange-600 rounded-full group-hover:scale-110 transition-transform">
                            <Utensils size={28} />
                        </div>
                        <span className="font-medium text-foreground">Log Usage</span>
                    </Link>

                    {/* Manual Sale (Manager Only) */}
                    {isManager && (
                        <Link href="/inventory/sell" className="group bg-white p-6 rounded-xl border border-border shadow-sm hover:shadow-md transition-all flex flex-col items-center text-center gap-3">
                            <div className="p-4 bg-green-100 text-green-600 rounded-full group-hover:scale-110 transition-transform">
                                <ShoppingBag size={28} />
                            </div>
                            <span className="font-medium text-foreground">Record Sale</span>
                        </Link>
                    )}

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

                    {/* Compliance Reminders (Manager Only) */}
                    {isManager && (
                        <button
                            onClick={openGeneralDatesModal}
                            className="group bg-white p-6 rounded-xl border border-border shadow-sm hover:shadow-md transition-all flex flex-col items-center text-center gap-3"
                        >
                            <div className="p-4 bg-blue-100 text-blue-600 rounded-full group-hover:scale-110 transition-transform">
                                <Calendar size={28} />
                            </div>
                            <span className="font-medium text-foreground">Set Compliance Reminders</span>
                        </button>
                    )}

                </div>
            </section>

            {/* 4. Recent Activity (Manager Only) */}
            {isManager && recentActivity.length > 0 && (
                <section className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-border">
                        <h3 className="font-semibold">Recent Activity</h3>
                    </div>
                    <div className="divide-y divide-border max-h-80 overflow-y-auto">
                        {recentActivity.map((activity: any) => {
                            const changeTypeColors: Record<string, { bg: string; text: string; label: string }> = {
                                RECEIVE: { bg: 'bg-green-100', text: 'text-green-700', label: 'Received' },
                                CONSUME: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Consumed' },
                                SALE: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Sold' },
                                WASTE: { bg: 'bg-red-100', text: 'text-red-700', label: 'Wasted' },
                                ADJUST: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Adjusted' }
                            };
                            const colorInfo = changeTypeColors[activity.change_type] || changeTypeColors.ADJUST;

                            return (
                                <div key={activity.id} className="p-3 hover:bg-gray-50 transition-colors">
                                    <div className="flex items-start gap-3">
                                        <span className={`px-2 py-0.5 text-xs font-medium rounded ${colorInfo.bg} ${colorInfo.text}`}>
                                            {colorInfo.label}
                                        </span>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium truncate">
                                                {activity.items?.name || 'Unknown Item'}
                                                <span className="text-gray-500 ml-2">
                                                    {activity.quantity_change > 0 ? '+' : ''}{activity.quantity_change} {activity.items?.unit_of_measure || 'units'}
                                                </span>
                                            </p>
                                            <p className="text-xs text-gray-500 mt-0.5">
                                                {activity.profiles?.full_name || 'System'} • {new Date(activity.timestamp).toLocaleString()}
                                            </p>
                                            {activity.notes && (
                                                <p className="text-xs text-gray-400 mt-1 truncate">{activity.notes}</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </section>
            )}

            {/* 5. Your Tasks Section */}
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

            {/* General Dates Modal */}
            {showGeneralDatesModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-xl">
                        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h3 className="font-bold text-lg">Manage General Dates</h3>
                            <button onClick={() => setShowGeneralDatesModal(false)} className="text-gray-400 hover:text-gray-600">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-4 space-y-4">
                            {/* Add New */}
                            <div className="flex gap-2 items-end">
                                <div className="flex-1">
                                    <label className="text-xs font-medium text-gray-500 mb-1 block">Event Name</label>
                                    <input
                                        type="text"
                                        value={generalLabel}
                                        onChange={(e) => setGeneralLabel(e.target.value)}
                                        placeholder="e.g. License Renewal"
                                        className="w-full h-10 px-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary outline-none"
                                    />
                                </div>
                                <div className="w-32">
                                    <label className="text-xs font-medium text-gray-500 mb-1 block">Date</label>
                                    <input
                                        type="date"
                                        value={generalDate}
                                        onChange={(e) => setGeneralDate(e.target.value)}
                                        className="w-full h-10 px-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary outline-none"
                                    />
                                </div>
                                <button
                                    onClick={handleAddGeneralDate}
                                    className="h-10 w-10 bg-primary text-white rounded-lg flex items-center justify-center hover:bg-primary/90 transition-colors"
                                >
                                    <Plus size={20} />
                                </button>
                            </div>

                            {/* List */}
                            <div className="space-y-2 max-h-60 overflow-y-auto">
                                {generalDatesList.length === 0 ? (
                                    <p className="text-center text-gray-400 text-sm py-4">No general dates added.</p>
                                ) : (
                                    generalDatesList.map(date => (
                                        <div key={date.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                                            <div>
                                                <p className="font-medium text-sm">{date.label}</p>
                                                <p className="text-xs text-gray-500">{new Date(date.target_date).toLocaleDateString()}</p>
                                            </div>
                                            <button
                                                onClick={() => handleDeleteGeneralDate(date.id)}
                                                className="text-gray-400 hover:text-red-500 transition-colors"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
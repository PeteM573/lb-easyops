'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MapPin, Plus, Edit2, Trash2, Save, X, AlertCircle, Loader2, Check, ArrowLeft } from 'lucide-react';

interface Location {
    id: number;
    name: string;
    is_default: boolean;
    item_count?: number;
}

export default function LocationsPage() {
    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const router = useRouter();

    const [locations, setLocations] = useState<Location[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // Add Mode
    const [isAdding, setIsAdding] = useState(false);
    const [newLocationName, setNewLocationName] = useState('');

    // Edit Mode
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editName, setEditName] = useState('');

    useEffect(() => {
        fetchLocations();
    }, []);

    const fetchLocations = async () => {
        setLoading(true);

        // 1. Check Role
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            router.push('/login');
            return;
        }

        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (profile?.role?.toLowerCase() !== 'manager' && profile?.role?.toLowerCase() !== 'admin') {
            router.push('/inventory/report'); // Redirect unauthorized users
            return;
        }

        // 2. Fetch Locations
        const { data: locs, error: locError } = await supabase
            .from('locations')
            .select('*')
            .order('id', { ascending: true });

        if (locError) {
            setError(locError.message);
            setLoading(false);
            return;
        }

        // 3. Fetch Item Counts (to check for deletion eligibility)
        // We can't easily do a count join in one query with simple Supabase client without a view or RPC,
        // so we'll do a separate query or just handle it on delete. 
        // For UI niceness, let's try to get counts.
        const { data: itemLocs } = await supabase
            .from('item_locations')
            .select('location_id');

        // Count items per location
        const counts: Record<number, number> = {};
        itemLocs?.forEach((item: any) => {
            counts[item.location_id] = (counts[item.location_id] || 0) + 1;
        });

        const locationsWithCounts = locs.map(l => ({
            ...l,
            item_count: counts[l.id] || 0
        }));

        setLocations(locationsWithCounts);
        setLoading(false);
    };

    const handleAdd = async () => {
        if (!newLocationName.trim()) return;
        setError(null);

        const { error: insertError } = await supabase
            .from('locations')
            .insert([{ name: newLocationName.trim() }]);

        if (insertError) {
            setError(insertError.message);
        } else {
            setSuccess('Location added successfully');
            setNewLocationName('');
            setIsAdding(false);
            fetchLocations(); // Refresh list
            setTimeout(() => setSuccess(null), 3000);
        }
    };

    const handleUpdate = async (id: number) => {
        if (!editName.trim()) return;
        setError(null);

        const { error: updateError } = await supabase
            .from('locations')
            .update({ name: editName.trim() })
            .eq('id', id);

        if (updateError) {
            setError(updateError.message);
        } else {
            setSuccess('Location updated successfully');
            setEditingId(null);
            fetchLocations(); // Refresh list
            setTimeout(() => setSuccess(null), 3000);
        }
    };

    const handleDelete = async (id: number, itemCount: number) => {
        if (itemCount > 0) {
            setError(`Cannot delete location. It contains ${itemCount} items. Please move or remove items first.`);
            return;
        }

        if (!confirm('Are you sure you want to delete this location?')) return;

        setError(null);
        const { error: deleteError } = await supabase
            .from('locations')
            .delete()
            .eq('id', id);

        if (deleteError) {
            setError(deleteError.message);
        } else {
            setSuccess('Location deleted successfully');
            fetchLocations(); // Refresh list
            setTimeout(() => setSuccess(null), 3000);
        }
    };

    const startEdit = (loc: Location) => {
        setEditingId(loc.id);
        setEditName(loc.name);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <Loader2 className="animate-spin text-gray-400" size={32} />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background pb-24">
            {/* Header */}
            <div className="sticky top-0 bg-background z-10 pt-6 pb-4 px-4 md:px-8 border-b border-border">
                <div className="max-w-3xl mx-auto">
                    <div className="flex items-center justify-between mb-2">
                        <Link href="/inventory/report" className="text-sm text-gray-500 hover:text-foreground transition-colors flex items-center gap-1">
                            <ArrowLeft size={16} /> Back to Inventory
                        </Link>
                    </div>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-primary/10 text-primary rounded-xl">
                                <MapPin size={28} />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-foreground">Manage Locations</h1>
                                <p className="text-sm text-gray-500">Add or edit storage locations</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setIsAdding(true)}
                            disabled={isAdding}
                            className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors disabled:opacity-50"
                        >
                            <Plus size={20} />
                            Add Location
                        </button>
                    </div>
                </div>
            </div>

            <main className="px-4 md:px-8 py-6">
                <div className="max-w-3xl mx-auto space-y-6">

                    {/* Alerts */}
                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                            <AlertCircle className="text-red-600 shrink-0" size={20} />
                            <p className="text-sm text-red-700">{error}</p>
                            <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600">
                                <X size={16} />
                            </button>
                        </div>
                    )}
                    {success && (
                        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                            <Check className="text-green-600 shrink-0" size={20} />
                            <p className="text-sm text-green-700">{success}</p>
                        </div>
                    )}

                    {/* Add New Location Form */}
                    {isAdding && (
                        <div className="bg-white p-4 rounded-xl border border-primary/20 shadow-sm animate-in fade-in slide-in-from-top-2">
                            <label className="block text-sm font-medium text-foreground mb-2">New Location Name</label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={newLocationName}
                                    onChange={(e) => setNewLocationName(e.target.value)}
                                    placeholder="e.g., Warehouse B, Shelf 3"
                                    className="flex-1 h-10 px-3 rounded-lg border border-input bg-white focus:ring-2 focus:ring-primary outline-none"
                                    autoFocus
                                />
                                <button
                                    onClick={handleAdd}
                                    className="px-4 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors"
                                >
                                    Save
                                </button>
                                <button
                                    onClick={() => { setIsAdding(false); setNewLocationName(''); }}
                                    className="px-4 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Locations List */}
                    <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
                        <div className="divide-y divide-border">
                            {locations.map((loc) => (
                                <div key={loc.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors group">
                                    {editingId === loc.id ? (
                                        // Edit Mode
                                        <div className="flex-1 flex gap-2 items-center">
                                            <input
                                                type="text"
                                                value={editName}
                                                onChange={(e) => setEditName(e.target.value)}
                                                className="flex-1 h-10 px-3 rounded-lg border border-input bg-white focus:ring-2 focus:ring-primary outline-none"
                                                autoFocus
                                            />
                                            <button
                                                onClick={() => handleUpdate(loc.id)}
                                                className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                                title="Save"
                                            >
                                                <Save size={20} />
                                            </button>
                                            <button
                                                onClick={() => setEditingId(null)}
                                                className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                                                title="Cancel"
                                            >
                                                <X size={20} />
                                            </button>
                                        </div>
                                    ) : (
                                        // View Mode
                                        <>
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2 rounded-lg ${loc.is_default ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                                                    <MapPin size={20} />
                                                </div>
                                                <div>
                                                    <p className="font-medium text-foreground flex items-center gap-2">
                                                        {loc.name}
                                                        {loc.is_default && (
                                                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Default</span>
                                                        )}
                                                    </p>
                                                    <p className="text-xs text-gray-500">
                                                        {loc.item_count} items stored here
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => startEdit(loc)}
                                                    className="p-2 text-gray-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-colors"
                                                    title="Rename"
                                                >
                                                    <Edit2 size={18} />
                                                </button>
                                                {!loc.is_default && (
                                                    <button
                                                        onClick={() => handleDelete(loc.id, loc.item_count || 0)}
                                                        className={`p-2 rounded-lg transition-colors ${(loc.item_count || 0) > 0
                                                            ? 'text-gray-300 cursor-not-allowed'
                                                            : 'text-gray-400 hover:text-red-600 hover:bg-red-50'
                                                            }`}
                                                        title={(loc.item_count || 0) > 0 ? "Cannot delete: Location has items" : "Delete Location"}
                                                        disabled={(loc.item_count || 0) > 0}
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                )}
                                            </div>
                                        </>
                                    )}
                                </div>
                            ))}

                            {locations.length === 0 && !loading && (
                                <div className="p-8 text-center text-gray-500">
                                    <p>No locations found.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

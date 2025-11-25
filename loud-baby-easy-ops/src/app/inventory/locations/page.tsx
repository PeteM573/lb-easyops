'use client';

import React, { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import Link from 'next/link';
import { ArrowLeft, MapPin, Plus, Trash2, Check, Star } from 'lucide-react';

interface Location {
    id: number;
    name: string;
    is_default: boolean;
}

export default function LocationsPage() {
    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const [locations, setLocations] = useState<Location[]>([]);
    const [loading, setLoading] = useState(true);
    const [newLocationName, setNewLocationName] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // Fetch locations
    const fetchLocations = async () => {
        const { data, error } = await supabase
            .from('locations')
            .select('*')
            .order('id', { ascending: true });

        if (error) {
            console.error('Error fetching locations:', error);
        } else {
            setLocations(data || []);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchLocations();
    }, [supabase]);

    // Add new location
    const handleAddLocation = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newLocationName.trim()) return;

        setSubmitting(true);
        const { error } = await supabase
            .from('locations')
            .insert([{ name: newLocationName.trim(), is_default: false }]);

        if (error) {
            alert('Error adding location. Name might be duplicate.');
        } else {
            setNewLocationName('');
            fetchLocations();
        }
        setSubmitting(false);
    };

    // Delete location
    const handleDeleteLocation = async (id: number) => {
        if (!confirm('Are you sure? This will delete the location and all associated stock records.')) return;

        const { error } = await supabase
            .from('locations')
            .delete()
            .eq('id', id);

        if (error) {
            alert('Error deleting location.');
        } else {
            fetchLocations();
        }
    };

    // Set default location
    const handleSetDefault = async (id: number) => {
        // 1. Unset current default
        await supabase
            .from('locations')
            .update({ is_default: false })
            .eq('is_default', true);

        // 2. Set new default
        const { error } = await supabase
            .from('locations')
            .update({ is_default: true })
            .eq('id', id);

        if (error) {
            alert('Error setting default location.');
        } else {
            fetchLocations();
        }
    };

    return (
        <div className="min-h-screen bg-background p-6 pb-24">
            <div className="max-w-2xl mx-auto space-y-8">

                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                            <MapPin className="text-primary" size={28} />
                            Locations
                        </h1>
                        <p className="text-gray-500">Manage where your inventory is stored.</p>
                    </div>
                    <Link href="/" className="text-sm text-gray-500 hover:text-foreground flex items-center gap-1">
                        <ArrowLeft size={16} />
                        Back
                    </Link>
                </div>

                {/* Add Location Form */}
                <div className="bg-white p-6 rounded-xl border border-border shadow-sm">
                    <h2 className="font-semibold mb-4">Add New Location</h2>
                    <form onSubmit={handleAddLocation} className="flex gap-3">
                        <input
                            type="text"
                            value={newLocationName}
                            onChange={(e) => setNewLocationName(e.target.value)}
                            placeholder="e.g. Back Room, Kitchen, Warehouse"
                            className="flex-1 px-4 py-3 rounded-xl border border-input focus:ring-2 focus:ring-primary outline-none"
                        />
                        <button
                            type="submit"
                            disabled={submitting || !newLocationName.trim()}
                            className="px-6 bg-primary text-white font-semibold rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
                        >
                            <Plus size={20} />
                            Add
                        </button>
                    </form>
                </div>

                {/* Locations List */}
                <div className="space-y-4">
                    <h2 className="font-semibold text-lg">Your Locations</h2>
                    {loading ? (
                        <div className="text-center py-8 text-gray-400">Loading...</div>
                    ) : locations.length === 0 ? (
                        <div className="text-center py-8 text-gray-500 bg-white rounded-xl border border-dashed">
                            No locations found. Add one above!
                        </div>
                    ) : (
                        locations.map((loc) => (
                            <div key={loc.id} className="bg-white p-4 rounded-xl border border-border shadow-sm flex items-center justify-between group">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-lg ${loc.is_default ? 'bg-yellow-100 text-yellow-600' : 'bg-gray-100 text-gray-400'}`}>
                                        <MapPin size={20} />
                                    </div>
                                    <div>
                                        <p className="font-medium text-foreground">{loc.name}</p>
                                        {loc.is_default && <span className="text-xs text-yellow-600 font-medium">Default Location</span>}
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    {!loc.is_default && (
                                        <>
                                            <button
                                                onClick={() => handleSetDefault(loc.id)}
                                                className="p-2 text-gray-400 hover:text-yellow-500 hover:bg-yellow-50 rounded-lg transition-colors"
                                                title="Set as Default"
                                            >
                                                <Star size={18} />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteLocation(loc.id)}
                                                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                title="Delete Location"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </>
                                    )}
                                    {loc.is_default && (
                                        <div className="p-2 text-yellow-500">
                                            <Star size={18} fill="currentColor" />
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>

            </div>
        </div>
    );
}

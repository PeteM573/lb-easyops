'use client';

import React, { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { PackagePlus, MapPin, DollarSign, AlertCircle, Check, X, Package, Loader2, Edit, Calendar, Trash2, Plus, Barcode as BarcodeIcon } from 'lucide-react';
import BarcodeGenerator from '@/components/BarcodeGenerator';
import BarcodePrintButton from '@/components/BarcodePrintButton';
import { formatQuantityWithUnit } from '@/lib/pluralize-unit';

export default function EditItemPage() {
    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const router = useRouter();
    const searchParams = useSearchParams();
    const itemId = searchParams.get('id');

    const [itemName, setItemName] = useState('');
    const [category, setCategory] = useState('Retail');
    const [barcode, setBarcode] = useState('');
    const [location, setLocation] = useState(''); // Legacy storage_location string
    const [uom, setUom] = useState('');
    const [cost, setCost] = useState<number | ''>('');
    const [threshold, setThreshold] = useState<number | ''>('');
    const [isAutoDeduct, setIsAutoDeduct] = useState(false);

    // Vendor Comparison State
    const [comparisonPrice, setComparisonPrice] = useState<number | ''>('');
    const [comparisonVendor, setComparisonVendor] = useState('');

    // Multi-location state
    const [locations, setLocations] = useState<{ id: number; name: string }[]>([]);
    const [stockMap, setStockMap] = useState<Record<number, number>>({});

    // Important Dates State
    const [userRole, setUserRole] = useState<string>('staff');
    const [dates, setDates] = useState<{ id?: number; label: string; target_date: string; notify_manager: boolean }[]>([]);
    const [deletedDateIds, setDeletedDateIds] = useState<number[]>([]);

    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // Delete confirmation state
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteConfirmText, setDeleteConfirmText] = useState('');

    // Helper function to generate unique 10-digit barcode number
    const generateBarcodeNumber = () => {
        // Generate random 10-digit number
        const randomNumber = Math.floor(1000000000 + Math.random() * 9000000000);
        return randomNumber.toString();
    };

    // Helper function to determine category from barcode prefix
    const getCategoryFromBarcode = (barcodeValue: string): string | null => {
        const prefix = barcodeValue.substring(0, 3).toUpperCase();
        switch (prefix) {
            case 'LBC':
                return 'Consumables';
            case 'LBR':
                return 'Retail';
            case 'LBM':
                return 'Raw Materials';
            case 'LBA':
                return 'Accessories';
            default:
                return null; // No auto-categorization
        }
    };

    // Handler for barcode changes with auto-categorization
    const handleBarcodeChange = (value: string) => {
        setBarcode(value);

        // Auto-populate category if barcode has valid prefix
        if (value.length >= 3) {
            const autoCategory = getCategoryFromBarcode(value);
            if (autoCategory) {
                setCategory(autoCategory);

                // Auto-enable auto-deduct for Retail and Accessories
                if (autoCategory === 'Retail' || autoCategory === 'Accessories') {
                    setIsAutoDeduct(true);
                } else {
                    setIsAutoDeduct(false);
                }
            }
        }
    };

    // Helper function to convert to smart title case
    // Preserves single letters (S, M, L) and handles abbreviations (H&S)
    const toTitleCase = (str: string) => {
        return str
            .split(' ')
            .map(word => {
                // If the word is a single character, keep it uppercase
                if (word.length === 1) {
                    return word.toUpperCase();
                }

                // If word contains &, preserve each part's capitalization for abbreviations
                if (word.includes('&')) {
                    return word.split('&').map(part => {
                        if (part.length === 1) return part.toUpperCase();
                        return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
                    }).join('&');
                }

                // Standard title case for regular words
                return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
            })
            .join(' ');
    };

    useEffect(() => {
        const fetchData = async () => {
            if (!itemId) {
                setError('No item ID provided');
                setIsLoading(false);
                return;
            }

            // 0. Fetch User Role
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', user.id)
                    .single();
                if (profile) setUserRole(profile.role || 'staff');
            }

            // 1. Fetch Item
            const { data: itemData, error: itemError } = await supabase
                .from('items')
                .select('*')
                .eq('id', itemId)
                .single();

            if (itemError || !itemData) {
                setError('Item not found');
                setIsLoading(false);
                return;
            }

            // 2. Fetch All Locations
            const { data: locData, error: locError } = await supabase
                .from('locations')
                .select('id, name')
                .order('id', { ascending: true });

            if (locData) setLocations(locData);

            // 3. Fetch Item Stock per Location
            const { data: stockData, error: stockError } = await supabase
                .from('item_locations')
                .select('location_id, quantity')
                .eq('item_id', itemId);

            const initialStockMap: Record<number, number> = {};
            // Initialize with 0 for all locations
            locData?.forEach(l => initialStockMap[l.id] = 0);
            // Fill with actual data
            stockData?.forEach(s => initialStockMap[s.location_id] = s.quantity);
            setStockMap(initialStockMap);

            // 4. Fetch Important Dates
            const { data: datesData } = await supabase
                .from('item_dates')
                .select('*')
                .eq('item_id', itemId)
                .order('target_date', { ascending: true });

            if (datesData) {
                setDates(datesData.map(d => ({
                    id: d.id,
                    label: d.label,
                    target_date: d.target_date,
                    notify_manager: d.notify_manager
                })));
            }

            // Pre-fill form
            setItemName(itemData.name || '');
            setCategory(itemData.category || 'Retail');
            setBarcode(itemData.barcode || '');
            setIsAutoDeduct(itemData.is_auto_deduct || false);
            setLocation(itemData.storage_location || '');
            setUom(itemData.unit_of_measure || '');
            setCost(itemData.cost_per_unit ?? '');
            setThreshold(itemData.alert_threshold ?? '');
            setComparisonPrice(itemData.comparison_price ?? '');
            setComparisonVendor(itemData.comparison_vendor || '');

            setIsLoading(false);
        };

        fetchData();
    }, [itemId, supabase]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);
        setSuccess(null);

        // 1. Calculate new total stock
        const totalStock = Object.values(stockMap).reduce((sum, qty) => sum + qty, 0);

        // 1.5. Auto-generate barcode if empty
        const finalBarcode = barcode.trim() || generateBarcodeNumber();

        // 2. Update Item Details
        const { error: updateError } = await supabase
            .from('items')
            .update({
                name: itemName,
                category: category,
                storage_location: location,
                stock_quantity: totalStock,
                unit_of_measure: uom,
                cost_per_unit: cost === '' ? 0 : cost,
                alert_threshold: threshold === '' ? 0 : threshold,
                barcode: finalBarcode,
                is_auto_deduct: isAutoDeduct,
                comparison_price: comparisonPrice === '' ? null : comparisonPrice,
                comparison_vendor: comparisonVendor || null,
            })
            .eq('id', itemId);

        if (updateError) {
            setError(`Failed to update item: ${updateError.message}`);
            setIsSubmitting(false);
            return;
        }

        // 3. Update Item Locations
        const upsertData = Object.entries(stockMap).map(([locId, qty]) => ({
            item_id: Number(itemId),
            location_id: Number(locId),
            quantity: qty
        }));

        const { error: locUpdateError } = await supabase
            .from('item_locations')
            .upsert(upsertData, { onConflict: 'item_id, location_id' });

        if (locUpdateError) {
            setError(`Failed to update stock locations: ${locUpdateError.message}`);
            setIsSubmitting(false);
            return;
        }

        // 4. Update Important Dates (Manager Only)
        if (userRole.toLowerCase() === 'manager' || userRole.toLowerCase() === 'admin') {
            // Delete removed dates
            if (deletedDateIds.length > 0) {
                await supabase.from('item_dates').delete().in('id', deletedDateIds);
            }

            // Upsert current dates
            if (dates.length > 0) {
                const datesToUpsert = dates.map(d => ({
                    id: d.id, // Include ID if it exists (update), otherwise undefined (insert)
                    item_id: Number(itemId),
                    label: d.label,
                    target_date: d.target_date,
                    notify_manager: d.notify_manager,
                    reminder_sent: false // Reset reminder if updated? Or keep? For now reset to ensure new reminder if date changed.
                }));

                const { error: datesError } = await supabase
                    .from('item_dates')
                    .upsert(datesToUpsert);

                if (datesError) {
                    console.error('Error updating dates:', datesError);
                    // Non-blocking error, just log it
                }
            }
        }

        setIsSubmitting(false);
        setBarcode(finalBarcode); // Update state with auto-generated value
        setSuccess(`Successfully updated "${itemName}"!`);
        setTimeout(() => {
            router.push('/inventory/report');
        }, 1500);
    };

    const handleDelete = async () => {
        if (deleteConfirmText !== 'DELETE') {
            setError('Please type DELETE to confirm');
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            // 1. Delete item_dates
            await supabase.from('item_dates').delete().eq('item_id', itemId);

            // 2. Delete item_locations
            await supabase.from('item_locations').delete().eq('item_id', itemId);

            // 3. Delete inventory_log entries
            await supabase.from('inventory_log').delete().eq('item_id', itemId);

            // 4. Delete the item itself
            const { error: deleteError } = await supabase
                .from('items')
                .delete()
                .eq('id', itemId);

            if (deleteError) {
                setError(`Failed to delete item: ${deleteError.message}`);
                setIsSubmitting(false);
                return;
            }

            setSuccess(`Successfully deleted "${itemName}"!`);
            setTimeout(() => {
                router.push('/inventory/report');
            }, 1000);
        } catch (err) {
            setError('An unexpected error occurred while deleting the item');
            setIsSubmitting(false);
        }
    };

    const handleStockChange = (locId: number, val: string) => {
        const numVal = val === '' ? 0 : parseFloat(val);
        setStockMap(prev => ({ ...prev, [locId]: numVal }));
    };

    const handleAddDate = () => {
        setDates([...dates, { label: '', target_date: '', notify_manager: true }]);
    };

    const handleRemoveDate = (index: number) => {
        const dateToRemove = dates[index];
        if (dateToRemove.id) {
            setDeletedDateIds([...deletedDateIds, dateToRemove.id]);
        }
        setDates(dates.filter((_, i) => i !== index));
    };

    const handleDateChange = (index: number, field: keyof typeof dates[0], value: any) => {
        const newDates = [...dates];
        newDates[index] = { ...newDates[index], [field]: value };
        setDates(newDates);
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="flex items-center gap-3 text-gray-500">
                    <Loader2 className="animate-spin" size={24} />
                    <span>Loading item...</span>
                </div>
            </div>
        );
    }

    if (error && !itemName) {
        return (
            <div className="min-h-screen bg-background p-4">
                <div className="max-w-3xl mx-auto mt-8 bg-red-50 border border-red-200 rounded-xl p-6">
                    <div className="flex items-start gap-3">
                        <AlertCircle className="text-red-600 shrink-0" size={24} />
                        <div>
                            <p className="font-semibold text-red-900">Error</p>
                            <p className="text-sm text-red-700">{error}</p>
                            <Link href="/inventory/report" className="text-sm text-red-600 hover:text-red-800 underline mt-2 inline-block">
                                ← Back to Inventory Report
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background pb-24">

            {/* Header */}
            <div className="sticky top-0 bg-background z-10 pt-6 pb-4 px-4 md:px-8 border-b border-border">
                <div className="max-w-3xl mx-auto">
                    <div className="flex items-center justify-between mb-2">
                        <Link href="/inventory/report" className="text-sm text-gray-500 hover:text-foreground transition-colors">
                            ← Back
                        </Link>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-primary/10 text-primary rounded-xl">
                            <Edit size={28} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-foreground">Edit Item</h1>
                            <p className="text-sm text-gray-500">Update item details</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Form */}
            <main className="px-4 md:px-8 py-6">
                <form onSubmit={handleSubmit} className="max-w-3xl mx-auto space-y-6">

                    {/* Success/Error Messages */}
                    {success && (
                        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                            <div className="p-2 bg-green-100 text-green-700 rounded-full shrink-0">
                                <Check size={20} />
                            </div>
                            <div className="flex-1">
                                <p className="font-semibold text-green-900">Success!</p>
                                <p className="text-sm text-green-700">{success}</p>
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                            <div className="p-2 bg-red-100 text-red-700 rounded-full shrink-0">
                                <X size={20} />
                            </div>
                            <div className="flex-1">
                                <p className="font-semibold text-red-900">Error</p>
                                <p className="text-sm text-red-700">{error}</p>
                            </div>
                        </div>
                    )}

                    {/* Basic Information Section */}
                    <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
                        <div className="bg-gray-50 px-6 py-3 border-b border-border">
                            <h2 className="font-semibold text-foreground flex items-center gap-2">
                                <Package size={18} />
                                Basic Information
                            </h2>
                        </div>
                        <div className="p-6 space-y-5">

                            {/* Item Name */}
                            <div>
                                <label htmlFor="itemName" className="block text-sm font-medium text-foreground mb-2">
                                    Item Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    id="itemName"
                                    value={itemName}
                                    onChange={(e) => setItemName(toTitleCase(e.target.value))}
                                    required
                                    placeholder="e.g., Whole Milk, Honey Butter, Coffee Beans"
                                    className="block w-full h-12 px-4 rounded-xl border border-input bg-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-base"
                                />
                            </div>

                            {/* Category */}
                            <div>
                                <label htmlFor="category" className="block text-sm font-medium text-foreground mb-2">
                                    Category <span className="text-red-500">*</span>
                                </label>
                                <select
                                    id="category"
                                    value={category}
                                    onChange={(e) => setCategory(e.target.value)}
                                    className="block w-full h-12 px-4 rounded-xl border border-input bg-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-base"
                                >
                                    <option value="Retail">Retail</option>
                                    <option value="Accessories">Accessories</option>
                                    <option value="Raw Materials">Raw Materials</option>
                                    <option value="Consumables">Consumables</option>
                                </select>
                            </div>

                            {/* Shelf/Bin Label */}
                            <div>
                                <label htmlFor="location" className="block text-sm font-medium text-foreground mb-2">
                                    Shelf/Bin Label <span className="text-gray-400 text-xs font-normal">(Optional)</span>
                                </label>
                                <input
                                    type="text"
                                    id="location"
                                    value={location}
                                    onChange={(e) => setLocation(e.target.value)}
                                    placeholder="e.g., Shelf A3, Bin 12"
                                    className="block w-full h-12 px-4 rounded-xl border border-input bg-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-base"
                                />
                                <p className="mt-1.5 text-xs text-gray-500">
                                    Specific shelf or bin within your storage locations
                                </p>
                            </div>

                        </div>
                    </div>

                    {/* Stock & Pricing Section */}
                    <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
                        <div className="bg-gray-50 px-6 py-3 border-b border-border">
                            <h2 className="font-semibold text-foreground flex items-center gap-2">
                                <DollarSign size={18} />
                                Stock & Pricing
                            </h2>
                        </div>
                        <div className="p-6 space-y-5">

                            {/* Unit of Measure */}
                            <div>
                                <label htmlFor="uom" className="block text-sm font-medium text-foreground mb-2">
                                    Unit of Measure (Singular) <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    id="uom"
                                    placeholder="e.g., lb, oz, gallon, unit, lid, box"
                                    value={uom}
                                    onChange={(e) => setUom(e.target.value)}
                                    required
                                    className="block w-full h-12 px-4 rounded-xl border border-input bg-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-base"
                                />
                                <p className="mt-1.5 text-xs text-gray-500">
                                    💡 Use singular form (lid, not lids). Will pluralize automatically.
                                </p>
                            </div>

                            {/* Stock per Location */}
                            <div className="space-y-3">
                                <label className="block text-sm font-medium text-foreground">
                                    Stock Quantity per Location
                                </label>
                                <div className="bg-gray-50 rounded-xl border border-border p-4 space-y-3">
                                    {locations.map(loc => (
                                        <div key={loc.id} className="flex items-center justify-between gap-4">
                                            <label htmlFor={`loc-${loc.id}`} className="text-sm font-medium text-gray-700 flex-1">
                                                {loc.name}
                                            </label>
                                            <div className="w-32">
                                                <input
                                                    type="number"
                                                    id={`loc-${loc.id}`}
                                                    step="0.01"
                                                    min="0"
                                                    value={stockMap[loc.id] ?? ''}
                                                    onChange={(e) => handleStockChange(loc.id, e.target.value)}
                                                    className="block w-full h-10 px-3 text-right rounded-lg border border-input bg-white focus:ring-2 focus:ring-primary outline-none"
                                                    placeholder="0"
                                                />
                                            </div>
                                        </div>
                                    ))}
                                    <div className="pt-2 border-t border-gray-200 flex justify-between items-center">
                                        <span className="font-bold text-gray-700">Total Stock</span>
                                        <span className="font-bold text-lg text-primary">
                                            {formatQuantityWithUnit(Object.values(stockMap).reduce((a, b) => a + b, 0), uom)}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Cost and Threshold */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="cost" className="block text-sm font-medium text-foreground mb-2">
                                        Cost Per Unit ($)
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                                        <input
                                            type="number"
                                            step="0.01"
                                            id="cost"
                                            value={cost}
                                            onChange={(e) => setCost(e.target.value ? parseFloat(e.target.value) : '')}
                                            min="0"
                                            inputMode="decimal"
                                            placeholder="0.00"
                                            className="block w-full h-12 pl-8 pr-4 rounded-xl border border-input bg-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-base"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label htmlFor="threshold" className="block text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                                        <AlertCircle size={16} className="text-gray-400" />
                                        Low Stock Alert
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        id="threshold"
                                        value={threshold}
                                        onChange={(e) => setThreshold(e.target.value ? parseFloat(e.target.value) : '')}
                                        min="0"
                                        inputMode="decimal"
                                        placeholder="e.g., 5"
                                        className="block w-full h-12 px-4 rounded-xl border border-input bg-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-base"
                                    />
                                </div>
                            </div>

                            {/* Vendor Comparison (Manager Only) */}
                            {userRole.toLowerCase() === 'manager' || userRole.toLowerCase() === 'admin' ? (
                                <div className="border-t border-gray-200 pt-6 mt-6">
                                    <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                                        <DollarSign size={16} className="text-gray-400" />
                                        Vendor Comparison (Optional)
                                    </h3>
                                    <p className="text-xs text-gray-500 mb-4">Compare alternative suppliers to identify cost savings opportunities.</p>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label htmlFor="comparisonVendor" className="block text-sm font-medium text-foreground mb-2">
                                                Alternative Supplier Name
                                            </label>
                                            <input
                                                type="text"
                                                id="comparisonVendor"
                                                value={comparisonVendor}
                                                onChange={(e) => setComparisonVendor(e.target.value)}
                                                placeholder="e.g., Vendor B"
                                                className="block w-full h-12 px-4 rounded-xl border border-input bg-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-base"
                                            />
                                        </div>
                                        <div>
                                            <label htmlFor="comparisonPrice" className="block text-sm font-medium text-foreground mb-2">
                                                Alternative Price (per unit)
                                            </label>
                                            <div className="relative">
                                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    id="comparisonPrice"
                                                    value={comparisonPrice}
                                                    onChange={(e) => setComparisonPrice(e.target.value ? parseFloat(e.target.value) : '')}
                                                    min="0"
                                                    inputMode="decimal"
                                                    placeholder="0.00"
                                                    className="block w-full h-12 pl-8 pr-4 rounded-xl border border-input bg-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-base"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : null}

                        </div>
                    </div>

                    {/* Barcode & Labels Section */}
                    <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
                        <div className="bg-gray-50 px-6 py-3 border-b border-border">
                            <h2 className="font-semibold text-foreground flex items-center gap-2">
                                <BarcodeIcon size={18} />
                                Barcode & Labels
                            </h2>
                        </div>
                        <div className="p-6 space-y-6">

                            {/* Barcode Number Input */}
                            <div>
                                <label htmlFor="barcode" className="block text-sm font-medium text-foreground mb-2">
                                    Barcode Number
                                    <span className="text-gray-400 text-xs font-normal ml-2">(Auto-generated if left blank)</span>
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        id="barcode"
                                        value={barcode}
                                        onChange={(e) => handleBarcodeChange(e.target.value)}
                                        placeholder="Will auto-generate 10-digit number on save"
                                        className="flex-1 h-12 px-4 rounded-xl border border-input bg-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-base"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setBarcode(generateBarcodeNumber())}
                                        className="px-4 h-12 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors"
                                    >
                                        Generate New
                                    </button>
                                </div>
                                <p className="mt-1.5 text-xs text-gray-500">
                                    💡 <strong>Tip:</strong> Start with LBR (Retail), LBC (Consumables), LBM (Raw Materials), or LBA (Accessories) to auto-set category
                                </p>
                            </div>

                            {/* Barcode Display */}
                            {barcode && (
                                <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                                    <div>
                                        <label className="block text-sm font-medium text-foreground mb-2">
                                            Preview
                                        </label>
                                        <BarcodeGenerator value={barcode} />
                                    </div>

                                    {/* Print Button */}
                                    <div>
                                        <label className="block text-sm font-medium text-foreground mb-2">
                                            Print Labels
                                        </label>
                                        <BarcodePrintButton
                                            barcodeValue={barcode}
                                            itemName={itemName || 'Item'}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Auto-Deduct on Sale (Manager Only) */}
                            {(userRole.toLowerCase() === 'manager' || userRole.toLowerCase() === 'admin') && (
                                <div className="border-t border-gray-100 pt-6">
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={isAutoDeduct}
                                            onChange={(e) => setIsAutoDeduct(e.target.checked)}
                                            className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-2 focus:ring-primary cursor-pointer"
                                        />
                                        <div>
                                            <span className="text-sm font-medium text-foreground">
                                                Auto-Deduct on Sale
                                            </span>
                                            <p className="text-xs text-gray-500 mt-0.5">
                                                Automatically reduce inventory when sold via Square POS
                                            </p>
                                        </div>
                                    </label>
                                </div>
                            )}

                        </div>
                    </div>

                    {/* Important Dates Section (Manager Only) */}
                    {(userRole.toLowerCase() === 'manager' || userRole.toLowerCase() === 'admin') && (
                        <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
                            <div className="bg-gray-50 px-6 py-3 border-b border-border flex justify-between items-center">
                                <h2 className="font-semibold text-foreground flex items-center gap-2">
                                    <Calendar size={18} />
                                    Important Dates
                                </h2>
                                <span className="text-xs font-medium bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                                    Manager Only
                                </span>
                            </div>
                            <div className="p-6 space-y-4">
                                {dates.map((date, index) => (
                                    <div key={index} className="flex flex-col md:flex-row gap-3 items-start md:items-end bg-gray-50 p-3 rounded-lg border border-gray-100">
                                        <div className="flex-1 w-full">
                                            <label className="block text-xs font-medium text-gray-500 mb-1">Label</label>
                                            <input
                                                type="text"
                                                value={date.label}
                                                onChange={(e) => handleDateChange(index, 'label', e.target.value)}
                                                placeholder="e.g., Expiry Date"
                                                className="block w-full h-10 px-3 rounded-lg border border-input bg-white focus:ring-2 focus:ring-primary outline-none text-sm"
                                            />
                                        </div>
                                        <div className="w-full md:w-40">
                                            <label className="block text-xs font-medium text-gray-500 mb-1">Date</label>
                                            <input
                                                type="date"
                                                value={date.target_date}
                                                onChange={(e) => handleDateChange(index, 'target_date', e.target.value)}
                                                className="block w-full h-10 px-3 rounded-lg border border-input bg-white focus:ring-2 focus:ring-primary outline-none text-sm"
                                            />
                                        </div>
                                        <div className="flex items-center gap-2 h-10">
                                            <label className="flex items-center gap-2 cursor-pointer select-none">
                                                <input
                                                    type="checkbox"
                                                    checked={date.notify_manager}
                                                    onChange={(e) => handleDateChange(index, 'notify_manager', e.target.checked)}
                                                    className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                                                />
                                                <span className="text-sm text-gray-600">Notify</span>
                                            </label>
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveDate(index)}
                                                className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors ml-2"
                                                title="Remove Date"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </div>
                                ))}

                                <button
                                    type="button"
                                    onClick={handleAddDate}
                                    className="flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
                                >
                                    <Plus size={16} />
                                    Add Date
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Submit Button */}
                    <div className="flex gap-3">
                        <Link
                            href="/inventory/report"
                            className="flex-1 h-12 px-6 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-colors flex items-center justify-center"
                        >
                            Cancel
                        </Link>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex-1 h-12 px-6 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="animate-spin" size={20} />
                                    Updating...
                                </>
                            ) : (
                                <>
                                    <Check size={20} />
                                    Update Item
                                </>
                            )}
                        </button>
                    </div>

                </form>

                {/* Delete Button (Manager Only) */}
                {(userRole.toLowerCase() === 'manager' || userRole.toLowerCase() === 'admin') && (
                    <div className="mt-6 pt-6 border-t border-gray-200">
                        <button
                            type="button"
                            onClick={() => setShowDeleteModal(true)}
                            className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                            <Trash2 size={16} />
                            Delete Item
                        </button>
                    </div>
                )}

                {/* Delete Confirmation Modal */}
                {showDeleteModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                                    <AlertCircle className="text-red-600" size={24} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900">Delete Item</h3>
                                    <p className="text-sm text-gray-500">This action cannot be undone</p>
                                </div>
                            </div>

                            <div className="mb-4">
                                <p className="text-sm text-gray-600 mb-4">
                                    You are about to delete <strong>"{itemName}"</strong> and all associated data including:
                                </p>
                                <ul className="text-sm text-gray-600 space-y-1 ml-4 list-disc">
                                    <li>All stock records across locations</li>
                                    <li>Inventory transaction history</li>
                                    <li>Important dates and reminders</li>
                                </ul>
                            </div>

                            <div className="mb-6">
                                <label htmlFor="deleteConfirm" className="block text-sm font-medium text-gray-700 mb-2">
                                    Type <span className="font-mono font-bold">DELETE</span> to confirm:
                                </label>
                                <input
                                    type="text"
                                    id="deleteConfirm"
                                    value={deleteConfirmText}
                                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                                    className="block w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                                    placeholder="Type DELETE"
                                    autoComplete="off"
                                />
                            </div>

                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowDeleteModal(false);
                                        setDeleteConfirmText('');
                                        setError(null);
                                    }}
                                    className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors"
                                    disabled={isSubmitting}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleDelete}
                                    disabled={deleteConfirmText !== 'DELETE' || isSubmitting}
                                    className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="animate-spin" size={16} />
                                            Deleting...
                                        </>
                                    ) : (
                                        <>
                                            <Trash2 size={16} />
                                            Delete Item
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

            </main>
        </div >
    );
}

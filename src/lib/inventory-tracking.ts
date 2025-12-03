/**
 * Inventory Tracking Service
 * Centralized functions for logging inventory changes, processing sales, and adjustments
 */

import { SupabaseClient } from '@supabase/supabase-js';

export type ChangeType = 'RECEIVE' | 'CONSUME' | 'SALE' | 'ADJUST' | 'WASTE';

export interface InventoryLogEntry {
    itemId: number;
    changeType: ChangeType;
    quantityChange: number;
    unitCostAtTime?: number;
    userId?: string;
    notes?: string;
}

export interface SaleEntry {
    itemId: number;
    quantity: number;
    unitPrice: number;
    source: 'MANUAL' | 'SQUARE' | 'OTHER';
    paymentMethod?: 'CASH' | 'CARD' | 'OTHER';
    customerName?: string;
    userId?: string;
    notes?: string;
}

/**
 * Log an inventory change to the audit trail
 */
export async function logInventoryChange(
    supabase: SupabaseClient,
    entry: InventoryLogEntry
): Promise<{ success: boolean; error?: any }> {
    const { error } = await supabase
        .from('inventory_log')
        .insert({
            item_id: entry.itemId,
            change_type: entry.changeType,
            quantity_change: entry.quantityChange,
            unit_cost_at_time: entry.unitCostAtTime || 0,
            user_id: entry.userId || null,
            notes: entry.notes || null
        });

    if (error) {
        console.error('Error logging inventory change:', error);
        return { success: false, error };
    }

    return { success: true };
}

/**
 * Process a manual sale
 * - Creates sale record
 * - Logs inventory change
 * - Updates stock quantity
 */
export async function processSale(
    supabase: SupabaseClient,
    sale: SaleEntry
): Promise<{ success: boolean; error?: any; saleId?: number }> {
    // 1. Get current item details
    const { data: item, error: itemError } = await supabase
        .from('items')
        .select('id, stock_quantity, cost_per_unit, unit_of_measure')
        .eq('id', sale.itemId)
        .single();

    if (itemError || !item) {
        return { success: false, error: itemError || new Error('Item not found') };
    }

    // 2. Validate stock availability
    if (item.stock_quantity < sale.quantity) {
        return {
            success: false,
            error: new Error(`Insufficient stock. Available: ${item.stock_quantity} ${item.unit_of_measure}`)
        };
    }

    // 3. Insert sale record
    const { data: saleData, error: saleError } = await supabase
        .from('sales')
        .insert({
            item_id: sale.itemId,
            quantity: sale.quantity,
            unit_price: sale.unitPrice,
            source: sale.source,
            payment_method: sale.paymentMethod || null,
            customer_name: sale.customerName || null,
            user_id: sale.userId || null,
            notes: sale.notes || null
        })
        .select('id')
        .single();

    if (saleError) {
        return { success: false, error: saleError };
    }

    // 4. Update item stock quantity
    const newStock = Math.max(0, item.stock_quantity - sale.quantity);
    const { error: updateError } = await supabase
        .from('items')
        .update({ stock_quantity: newStock })
        .eq('id', sale.itemId);

    if (updateError) {
        console.error('Error updating stock after sale:', updateError);
        // Note: Sale record is already created, this is a warning
    }

    // 5. Log to inventory_log
    await logInventoryChange(supabase, {
        itemId: sale.itemId,
        changeType: 'SALE',
        quantityChange: -sale.quantity,
        unitCostAtTime: item.cost_per_unit || 0,
        userId: sale.userId,
        notes: sale.notes || `Sale via ${sale.source}: ${sale.quantity} units @ $${sale.unitPrice}`
    });

    return { success: true, saleId: saleData.id };
}

/**
 * Process an inventory adjustment (reconciliation)
 * Use when actual count differs from system count
 */
export async function processAdjustment(
    supabase: SupabaseClient,
    itemId: number,
    actualQuantity: number,
    userId?: string,
    notes?: string
): Promise<{ success: boolean; error?: any; adjustment?: number }> {
    // 1. Get current stock
    const { data: item, error: itemError } = await supabase
        .from('items')
        .select('stock_quantity, cost_per_unit')
        .eq('id', itemId)
        .single();

    if (itemError || !item) {
        return { success: false, error: itemError || new Error('Item not found') };
    }

    const adjustment = actualQuantity - item.stock_quantity;

    if (adjustment === 0) {
        return { success: true, adjustment: 0 }; // No adjustment needed
    }

    // 2. Update stock to actual quantity
    const { error: updateError } = await supabase
        .from('items')
        .update({ stock_quantity: actualQuantity })
        .eq('id', itemId);

    if (updateError) {
        return { success: false, error: updateError };
    }

    // 3. Log adjustment
    await logInventoryChange(supabase, {
        itemId,
        changeType: 'ADJUST',
        quantityChange: adjustment,
        unitCostAtTime: item.cost_per_unit || 0,
        userId,
        notes: notes || `Inventory adjustment: ${adjustment > 0 ? '+' : ''}${adjustment}`
    });

    return { success: true, adjustment };
}

/**
 * Get recent inventory activity (for dashboard feed)
 */
export async function getRecentActivity(
    supabase: SupabaseClient,
    limit: number = 10
): Promise<any[]> {
    const { data, error } = await supabase
        .from('inventory_log')
        .select(`
            id,
            change_type,
            quantity_change,
            timestamp,
            notes,
            items ( name, unit_of_measure ),
            profiles ( full_name )
        `)
        .order('timestamp', { ascending: false })
        .limit(limit);

    if (error) {
        console.error('Error fetching recent activity:', error);
        return [];
    }

    return data || [];
}

/**
 * Get detailed item history (for item detail page)
 */
export async function getItemHistory(
    supabase: SupabaseClient,
    itemId: number,
    limit: number = 50
): Promise<any[]> {
    const { data, error } = await supabase
        .from('inventory_log')
        .select(`
            id,
            change_type,
            quantity_change,
            unit_cost_at_time,
            timestamp,
            notes,
            profiles ( full_name )
        `)
        .eq('item_id', itemId)
        .order('timestamp', { ascending: false })
        .limit(limit);

    if (error) {
        console.error('Error fetching item history:', error);
        return [];
    }

    return data || [];
}

/**
 * Analytics Service
 * Provides COGS calculations, inventory analytics, and business metrics
 * Manager/Admin only - called from dashboard and reports pages
 */

import { SupabaseClient } from '@supabase/supabase-js';

export interface InventoryValue {
    totalValue: number;
    byCategory: {
        category: string;
        value: number;
        itemCount: number;
    }[];
}

export interface COGSMetrics {
    totalCOGS: number;
    revenue: number;
    grossProfit: number;
    grossProfitMargin: number; // As percentage
}

export interface TopItem {
    itemId: number;
    itemName: string;
    totalQuantity: number;
    transactionCount: number;
}

export interface WasteAnalysis {
    category: string;
    totalWasteQuantity: number;
    totalWasteValue: number;
    wasteCount: number;
}

export interface DashboardMetrics {
    inventoryValue: number;
    lowStockCount: number;
    negativeStockCount: number;
    monthlyCOGS: number;
    monthlyRevenue: number;
    monthlyGrossProfit: number;
    salesToday: {
        count: number;
        revenue: number;
    };
}

/**
 * Get total inventory value at cost
 */
export async function getInventoryValue(supabase: SupabaseClient): Promise<number> {
    const { data, error } = await supabase.rpc('get_inventory_value');

    if (error) {
        console.error('Error fetching inventory value:', error);
        return 0;
    }

    return parseFloat(data || '0');
}

/**
 * Get inventory value breakdown by category
 */
export async function getInventoryValueByCategory(supabase: SupabaseClient): Promise<InventoryValue['byCategory']> {
    const { data, error } = await supabase.rpc('get_inventory_value_by_category');

    if (error) {
        console.error('Error fetching inventory value by category:', error);
        return [];
    }

    return (data || []).map((row: any) => ({
        category: row.category,
        value: parseFloat(row.total_value || '0'),
        itemCount: parseInt(row.item_count || '0', 10)
    }));
}

/**
 * Get COGS for a specific period
 */
export async function getCOGSByPeriod(
    supabase: SupabaseClient,
    startDate: Date,
    endDate: Date
): Promise<number> {
    const { data, error } = await supabase.rpc('get_cogs_by_period', {
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString()
    });

    if (error) {
        console.error('Error fetching COGS:', error);
        return 0;
    }

    return parseFloat(data || '0');
}

/**
 * Get revenue for a specific period
 */
export async function getRevenueByPeriod(
    supabase: SupabaseClient,
    startDate: Date,
    endDate: Date
): Promise<number> {
    const { data, error } = await supabase.rpc('get_revenue_by_period', {
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString()
    });

    if (error) {
        console.error('Error fetching revenue:', error);
        return 0;
    }

    return parseFloat(data || '0');
}

/**
 * Get COGS metrics with gross profit calculation
 */
export async function getCOGSMetrics(
    supabase: SupabaseClient,
    startDate: Date,
    endDate: Date
): Promise<COGSMetrics> {
    const [cogs, revenue] = await Promise.all([
        getCOGSByPeriod(supabase, startDate, endDate),
        getRevenueByPeriod(supabase, startDate, endDate)
    ]);

    const grossProfit = revenue - cogs;
    const grossProfitMargin = revenue > 0 ? (grossProfit / revenue) * 100 : 0;

    return {
        totalCOGS: cogs,
        revenue,
        grossProfit,
        grossProfitMargin
    };
}

/**
 * Get count of items below alert threshold
 */
export async function getLowStockCount(supabase: SupabaseClient): Promise<number> {
    const { data, error } = await supabase.rpc('get_low_stock_count');

    if (error) {
        console.error('Error fetching low stock count:', error);
        return 0;
    }

    return parseInt(data || '0', 10);
}

/**
 * Get count of items with negative stock (data integrity issue)
 */
export async function getNegativeStockCount(supabase: SupabaseClient): Promise<number> {
    const { data, error } = await supabase.rpc('get_negative_stock_count');

    if (error) {
        console.error('Error fetching negative stock count:', error);
        return 0;
    }

    return parseInt(data || '0', 10);
}

/**
 * Get top items by consumption/sales volume
 */
export async function getTopItemsByVolume(
    supabase: SupabaseClient,
    startDate: Date,
    endDate: Date,
    limit: number = 5
): Promise<TopItem[]> {
    const { data, error } = await supabase.rpc('get_top_items_by_volume', {
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        item_limit: limit
    });

    if (error) {
        console.error('Error fetching top items:', error);
        return [];
    }

    return (data || []).map((row: any) => ({
        itemId: row.item_id,
        itemName: row.item_name,
        totalQuantity: parseFloat(row.total_quantity || '0'),
        transactionCount: parseInt(row.transaction_count || '0', 10)
    }));
}

/**
 * Get waste analysis for a period
 */
export async function getWasteByPeriod(
    supabase: SupabaseClient,
    startDate: Date,
    endDate: Date
): Promise<WasteAnalysis[]> {
    const { data, error } = await supabase.rpc('get_waste_by_period', {
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString()
    });

    if (error) {
        console.error('Error fetching waste data:', error);
        return [];
    }

    return (data || []).map((row: any) => ({
        category: row.category,
        totalWasteQuantity: parseFloat(row.total_waste_quantity || '0'),
        totalWasteValue: parseFloat(row.total_waste_value || '0'),
        wasteCount: parseInt(row.waste_count || '0', 10)
    }));
}

/**
 * Get sales for today
 */
export async function getSalesToday(supabase: SupabaseClient): Promise<{ count: number; revenue: number }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const { data, error } = await supabase
        .from('sales')
        .select('total_amount')
        .gte('sale_date', today.toISOString())
        .lt('sale_date', tomorrow.toISOString());

    if (error) {
        console.error('Error fetching sales today:', error);
        return { count: 0, revenue: 0 };
    }

    const count = data?.length || 0;
    const revenue = data?.reduce((sum, sale) => sum + parseFloat(sale.total_amount || '0'), 0) || 0;

    return { count, revenue };
}

/**
 * Get all dashboard metrics in one call (optimized)
 */
export async function getDashboardMetrics(supabase: SupabaseClient): Promise<DashboardMetrics> {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const [
        inventoryValue,
        lowStockCount,
        negativeStockCount,
        monthlyCOGS,
        monthlyRevenue,
        salesToday
    ] = await Promise.all([
        getInventoryValue(supabase),
        getLowStockCount(supabase),
        getNegativeStockCount(supabase),
        getCOGSByPeriod(supabase, monthStart, monthEnd),
        getRevenueByPeriod(supabase, monthStart, monthEnd),
        getSalesToday(supabase)
    ]);

    const monthlyGrossProfit = monthlyRevenue - monthlyCOGS;

    return {
        inventoryValue,
        lowStockCount,
        negativeStockCount,
        monthlyCOGS,
        monthlyRevenue,
        monthlyGrossProfit,
        salesToday
    };
}

/**
 * Helper: Format currency
 */
export function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(amount);
}

/**
 * Helper: Format percentage
 */
export function formatPercentage(value: number): string {
    return `${value.toFixed(1)}%`;
}

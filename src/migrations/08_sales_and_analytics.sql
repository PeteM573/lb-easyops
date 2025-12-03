-- Sales and Analytics Schema Enhancement
-- Adds sales tracking table and analytics functions for COGS and inventory value

-- ============================================================================
-- 1. SALES TABLE
-- ============================================================================
-- Track individual sales transactions (manual and Square POS)
CREATE TABLE IF NOT EXISTS sales (
    id BIGSERIAL PRIMARY KEY,
    item_id BIGINT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    quantity NUMERIC NOT NULL,
    unit_price NUMERIC NOT NULL,
    total_amount NUMERIC GENERATED ALWAYS AS (quantity * unit_price) STORED,
    sale_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    source TEXT NOT NULL CHECK (source IN ('MANUAL', 'SQUARE', 'OTHER')),
    payment_method TEXT CHECK (payment_method IN ('CASH', 'CARD', 'OTHER')),
    customer_name TEXT,
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_sales_item_id ON sales(item_id);
CREATE INDEX IF NOT EXISTS idx_sales_sale_date ON sales(sale_date DESC);
CREATE INDEX IF NOT EXISTS idx_sales_source ON sales(source);
CREATE INDEX IF NOT EXISTS idx_sales_user_id ON sales(user_id);

-- RLS Policies for sales
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;

-- Only managers/admins can view sales
CREATE POLICY "Allow managers to view sales"
    ON sales
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND (role = 'manager' OR role = 'admin')
        )
    );

-- Authenticated users can insert sales
CREATE POLICY "Allow authenticated users to insert sales"
    ON sales
    FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================================
-- 2. ANALYTICS FUNCTIONS
-- ============================================================================

-- Function: Get total inventory value at cost
CREATE OR REPLACE FUNCTION get_inventory_value()
RETURNS NUMERIC AS $$
    SELECT COALESCE(SUM(stock_quantity * COALESCE(cost_per_unit, 0)), 0)
    FROM items
    WHERE stock_quantity > 0;
$$ LANGUAGE SQL STABLE;

-- Function: Get COGS for a date range
-- Returns the total cost of goods sold/consumed/wasted in the period
CREATE OR REPLACE FUNCTION get_cogs_by_period(
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE
)
RETURNS NUMERIC AS $$
    SELECT COALESCE(SUM(ABS(quantity_change) * COALESCE(unit_cost_at_time, 0)), 0)
    FROM inventory_log
    WHERE change_type IN ('SALE', 'CONSUME', 'WASTE')
    AND timestamp BETWEEN start_date AND end_date;
$$ LANGUAGE SQL STABLE;

-- Function: Get total revenue for a date range
CREATE OR REPLACE FUNCTION get_revenue_by_period(
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE
)
RETURNS NUMERIC AS $$
    SELECT COALESCE(SUM(total_amount), 0)
    FROM sales
    WHERE sale_date BETWEEN start_date AND end_date;
$$ LANGUAGE SQL STABLE;

-- Function: Get low stock items (below alert threshold)
CREATE OR REPLACE FUNCTION get_low_stock_count()
RETURNS INTEGER AS $$
    SELECT COUNT(*)::INTEGER
    FROM items
    WHERE stock_quantity <= COALESCE(alert_threshold, 5)
    AND stock_quantity >= 0;
$$ LANGUAGE SQL STABLE;

-- Function: Get items with negative stock (data integrity issue)
CREATE OR REPLACE FUNCTION get_negative_stock_count()
RETURNS INTEGER AS $$
    SELECT COUNT(*)::INTEGER
    FROM items
    WHERE stock_quantity < 0;
$$ LANGUAGE SQL STABLE;

-- Function: Get inventory value by category
CREATE OR REPLACE FUNCTION get_inventory_value_by_category()
RETURNS TABLE (
    category TEXT,
    total_value NUMERIC,
    item_count BIGINT
) AS $$
    SELECT 
        category,
        SUM(stock_quantity * COALESCE(cost_per_unit, 0)) AS total_value,
        COUNT(*) AS item_count
    FROM items
    WHERE stock_quantity > 0
    GROUP BY category
    ORDER BY total_value DESC;
$$ LANGUAGE SQL STABLE;

-- Function: Get top items by consumption/sales volume
CREATE OR REPLACE FUNCTION get_top_items_by_volume(
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    item_limit INTEGER DEFAULT 5
)
RETURNS TABLE (
    item_id BIGINT,
    item_name TEXT,
    total_quantity NUMERIC,
    transaction_count BIGINT
) AS $$
    SELECT 
        il.item_id,
        i.name AS item_name,
        SUM(ABS(il.quantity_change)) AS total_quantity,
        COUNT(*) AS transaction_count
    FROM inventory_log il
    JOIN items i ON il.item_id = i.id
    WHERE il.change_type IN ('SALE', 'CONSUME')
    AND il.timestamp BETWEEN start_date AND end_date
    GROUP BY il.item_id, i.name
    ORDER BY total_quantity DESC
    LIMIT item_limit;
$$ LANGUAGE SQL STABLE;

-- Function: Get waste analysis
CREATE OR REPLACE FUNCTION get_waste_by_period(
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE
)
RETURNS TABLE (
    category TEXT,
    total_waste_quantity NUMERIC,
    total_waste_value NUMERIC,
    waste_count BIGINT
) AS $$
    SELECT 
        i.category,
        SUM(ABS(il.quantity_change)) AS total_waste_quantity,
        SUM(ABS(il.quantity_change) * COALESCE(il.unit_cost_at_time, 0)) AS total_waste_value,
        COUNT(*) AS waste_count
    FROM inventory_log il
    JOIN items i ON il.item_id = i.id
    WHERE il.change_type = 'WASTE'
    AND il.timestamp BETWEEN start_date AND end_date
    GROUP BY i.category
    ORDER BY total_waste_value DESC;
$$ LANGUAGE SQL STABLE;

-- ============================================================================
-- 3. MATERIALIZED VIEW FOR DASHBOARD PERFORMANCE (Optional)
-- ============================================================================
-- This can be refreshed periodically for fast dashboard loads
-- Uncomment if dashboard performance becomes an issue

-- CREATE MATERIALIZED VIEW IF NOT EXISTS dashboard_metrics AS
-- SELECT
--     (SELECT get_inventory_value()) AS total_inventory_value,
--     (SELECT get_low_stock_count()) AS low_stock_count,
--     (SELECT get_negative_stock_count()) AS negative_stock_count,
--     (SELECT get_cogs_by_period(
--         date_trunc('month', CURRENT_DATE),
--         CURRENT_DATE + interval '1 day'
--     )) AS current_month_cogs,
--     NOW() AS last_updated;

-- CREATE UNIQUE INDEX IF NOT EXISTS idx_dashboard_metrics_refresh ON dashboard_metrics(last_updated);

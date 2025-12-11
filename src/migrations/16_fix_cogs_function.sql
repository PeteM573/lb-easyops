-- Fix analytics functions to use correct column names and joins
-- 1. Fix get_cogs_by_period: use change_type and join items for cost_per_unit
CREATE OR REPLACE FUNCTION get_cogs_by_period(start_date TIMESTAMPTZ, end_date TIMESTAMPTZ)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN (
        SELECT COALESCE(SUM(ABS(il.quantity_change) * i.cost_per_unit), 0)
        FROM inventory_log il
        JOIN items i ON il.item_id = i.id
        WHERE il.change_type = 'CONSUME' AND il.created_at BETWEEN start_date AND end_date
    );
END;
$$;

-- 2. Fix get_top_items_by_volume: use change_type
CREATE OR REPLACE FUNCTION get_top_items_by_volume(start_date TIMESTAMPTZ, end_date TIMESTAMPTZ, limit_count INTEGER DEFAULT 10)
RETURNS TABLE (item_id BIGINT, item_name TEXT, total_consumed INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT il.item_id, i.name as item_name, SUM(ABS(il.quantity_change))::INTEGER as total_consumed
    FROM inventory_log il
    JOIN items i ON il.item_id = i.id
    WHERE il.change_type IN ('CONSUME', 'SALE') AND il.created_at BETWEEN start_date AND end_date
    GROUP BY il.item_id, i.name
    ORDER BY total_consumed DESC
    LIMIT limit_count;
END;
$$;

-- 3. Fix get_waste_by_period: use change_type = 'WASTE'
CREATE OR REPLACE FUNCTION get_waste_by_period(start_date TIMESTAMPTZ, end_date TIMESTAMPTZ)
RETURNS TABLE (item_id BIGINT, item_name TEXT, total_waste INTEGER, waste_value NUMERIC)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT il.item_id, i.name as item_name, 
           SUM(ABS(il.quantity_change))::INTEGER as total_waste,
           SUM(ABS(il.quantity_change) * i.cost_per_unit) as waste_value
    FROM inventory_log il
    JOIN items i ON il.item_id = i.id
    WHERE il.change_type = 'WASTE'
      AND il.created_at BETWEEN start_date AND end_date
    GROUP BY il.item_id, i.name
    ORDER BY waste_value DESC;
END;
$$;

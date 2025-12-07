-- ============================================================================
-- PART 2 of 3: ANALYTICS & MANAGEMENT FUNCTIONS
-- Run this after Part 1 succeeds
-- ============================================================================

-- Drop existing analytics functions (non-trigger functions only)
DROP FUNCTION IF EXISTS get_inventory_value();
DROP FUNCTION IF EXISTS get_inventory_value_by_category();
DROP FUNCTION IF EXISTS get_cogs_by_period(TIMESTAMPTZ, TIMESTAMPTZ);
DROP FUNCTION IF EXISTS get_revenue_by_period(TIMESTAMPTZ, TIMESTAMPTZ);
DROP FUNCTION IF EXISTS get_low_stock_items();
DROP FUNCTION IF EXISTS get_low_stock_count();
DROP FUNCTION IF EXISTS get_negative_stock_count();
DROP FUNCTION IF EXISTS get_top_items_by_volume(TIMESTAMPTZ, TIMESTAMPTZ, INTEGER);
DROP FUNCTION IF EXISTS get_waste_by_period(TIMESTAMPTZ, TIMESTAMPTZ);
DROP FUNCTION IF EXISTS update_inventory_stock(BIGINT, INTEGER, TEXT, TEXT);
DROP FUNCTION IF EXISTS get_user_role();
DROP FUNCTION IF EXISTS cleanup_old_webhook_events(INTEGER);

-- Recreate with SET search_path

CREATE FUNCTION get_inventory_value()
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN (
        SELECT COALESCE(SUM(stock_quantity * cost_per_unit), 0)
        FROM items
    );
END;
$$;

CREATE FUNCTION get_inventory_value_by_category()
RETURNS TABLE (category TEXT, total_value NUMERIC)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT i.category, COALESCE(SUM(i.stock_quantity * i.cost_per_unit), 0) as total_value
    FROM items i
    GROUP BY i.category
    ORDER BY total_value DESC;
END;
$$;

CREATE FUNCTION get_cogs_by_period(start_date TIMESTAMPTZ, end_date TIMESTAMPTZ)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN (
        SELECT COALESCE(SUM(ABS(quantity_change) * cost_per_unit), 0)
        FROM inventory_log
        WHERE action_type = 'CONSUME' AND created_at BETWEEN start_date AND end_date
    );
END;
$$;

CREATE FUNCTION get_revenue_by_period(start_date TIMESTAMPTZ, end_date TIMESTAMPTZ)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN (
        SELECT COALESCE(SUM(total_amount), 0)
        FROM sales
        WHERE sale_date BETWEEN start_date AND end_date
    );
END;
$$;

CREATE FUNCTION get_low_stock_items()
RETURNS TABLE (item_id BIGINT, item_name TEXT, stock_quantity INTEGER, alert_threshold INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT id, name, items.stock_quantity, items.alert_threshold
    FROM items
    WHERE alert_threshold IS NOT NULL AND stock_quantity <= alert_threshold
    ORDER BY stock_quantity ASC;
END;
$$;

CREATE FUNCTION get_low_stock_count()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)::INTEGER
        FROM items
        WHERE alert_threshold IS NOT NULL AND stock_quantity <= alert_threshold
    );
END;
$$;

CREATE FUNCTION get_negative_stock_count()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN (SELECT COUNT(*)::INTEGER FROM items WHERE stock_quantity < 0);
END;
$$;

CREATE FUNCTION get_top_items_by_volume(start_date TIMESTAMPTZ, end_date TIMESTAMPTZ, limit_count INTEGER DEFAULT 10)
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
    WHERE il.action_type IN ('CONSUME', 'SALE') AND il.created_at BETWEEN start_date AND end_date
    GROUP BY il.item_id, i.name
    ORDER BY total_consumed DESC
    LIMIT limit_count;
END;
$$;

CREATE FUNCTION get_waste_by_period(start_date TIMESTAMPTZ, end_date TIMESTAMPTZ)
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
    WHERE il.action_type = 'CONSUME' AND il.consume_type = 'WASTE'
      AND il.created_at BETWEEN start_date AND end_date
    GROUP BY il.item_id, i.name
    ORDER BY waste_value DESC;
END;
$$;

CREATE FUNCTION update_inventory_stock(p_item_id BIGINT, p_quantity_change INTEGER, p_action_type TEXT, p_notes TEXT DEFAULT NULL)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE items SET stock_quantity = stock_quantity + p_quantity_change WHERE id = p_item_id;
    INSERT INTO inventory_log (item_id, quantity_change, action_type, notes, user_id)
    VALUES (p_item_id, p_quantity_change, p_action_type, p_notes, auth.uid());
END;
$$;

CREATE FUNCTION get_user_role()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE user_role TEXT;
BEGIN
    SELECT role INTO user_role FROM profiles WHERE id = auth.uid();
    RETURN user_role;
END;
$$;

CREATE FUNCTION cleanup_old_webhook_events(days_to_keep INTEGER DEFAULT 30)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE deleted_count INTEGER;
BEGIN
    DELETE FROM webhook_events WHERE created_at < NOW() - (days_to_keep || ' days')::INTERVAL;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$;

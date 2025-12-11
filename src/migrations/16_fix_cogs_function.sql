-- Fix get_cogs_by_period function to join with items table for cost_per_unit

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
        WHERE il.action_type = 'CONSUME' AND il.created_at BETWEEN start_date AND end_date
    );
END;
$$;

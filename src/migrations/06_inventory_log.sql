-- Create inventory_log table for complete audit trail
-- Tracks all inventory changes: receives, consumes, sales, adjustments

CREATE TABLE IF NOT EXISTS inventory_log (
    id BIGSERIAL PRIMARY KEY,
    item_id BIGINT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    change_type TEXT NOT NULL CHECK (change_type IN ('RECEIVE', 'CONSUME', 'SALE', 'ADJUST', 'WASTE')),
    quantity_change NUMERIC NOT NULL,
    unit_cost_at_time NUMERIC DEFAULT 0,
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_inventory_log_item_id ON inventory_log(item_id);
CREATE INDEX IF NOT EXISTS idx_inventory_log_timestamp ON inventory_log(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_log_user_id ON inventory_log(user_id);
CREATE INDEX IF NOT EXISTS idx_inventory_log_change_type ON inventory_log(change_type);

-- RLS Policies
ALTER TABLE inventory_log ENABLE ROW LEVEL SECURITY;

-- Everyone can view logs
CREATE POLICY "Allow viewing inventory logs"
    ON inventory_log
    FOR SELECT
    USING (true);

-- Only authenticated users can insert logs
CREATE POLICY "Allow inserting inventory logs"
    ON inventory_log
    FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

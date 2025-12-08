-- Migration 15: Vendor Price Comparison
-- Adds columns to track competitor pricing for cost comparison

-- Add comparison fields to items table
ALTER TABLE items 
  ADD COLUMN IF NOT EXISTS comparison_price NUMERIC,
  ADD COLUMN IF NOT EXISTS comparison_vendor TEXT;

-- Add helpful comments
COMMENT ON COLUMN items.comparison_price IS 'Alternative supplier price per unit of measure for cost comparison';
COMMENT ON COLUMN items.comparison_vendor IS 'Name of alternative supplier/vendor offering the comparison price';

-- Create index for quick lookups of items with comparison data
CREATE INDEX IF NOT EXISTS idx_items_has_comparison 
  ON items (id) 
  WHERE comparison_price IS NOT NULL;

-- Verify columns were added
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'items' 
        AND column_name IN ('comparison_price', 'comparison_vendor')
    ) THEN
        RAISE NOTICE 'Vendor comparison columns added successfully';
    ELSE
        RAISE EXCEPTION 'Failed to add vendor comparison columns';
    END IF;
END $$;

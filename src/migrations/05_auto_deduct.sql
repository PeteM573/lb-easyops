-- Add is_auto_deduct column for automated consumables
-- When true, item quantity automatically decrements when sold via Square

ALTER TABLE items 
ADD COLUMN IF NOT EXISTS is_auto_deduct BOOLEAN DEFAULT FALSE;

-- Create index for faster queries on auto-deduct items
CREATE INDEX IF NOT EXISTS idx_items_auto_deduct ON items(is_auto_deduct) WHERE is_auto_deduct = TRUE;

-- Add comment for documentation
COMMENT ON COLUMN items.is_auto_deduct IS 'When true, inventory automatically decrements when item is sold via Square POS';

-- Singularize unit_of_measure in items table for proper pluralization
-- This migration converts plural units to singular form

-- Create a backup column to preserve original values
ALTER TABLE items ADD COLUMN IF NOT EXISTS unit_of_measure_original TEXT;

-- Backup existing values
UPDATE items 
SET unit_of_measure_original = unit_of_measure 
WHERE unit_of_measure_original IS NULL;

-- Singularize common plural units
-- Note: This handles most common cases. Review 'uncertain' cases manually.

-- Common regular plurals (just remove trailing 's')
UPDATE items SET unit_of_measure = 
  CASE 
    -- Irregular plurals (handle explicitly)
    WHEN LOWER(unit_of_measure) = 'boxes' THEN 'box'
    WHEN LOWER(unit_of_measure) = 'inches' THEN 'inch'
    
    -- Already singular or uncountable (don't change)
    WHEN LOWER(unit_of_measure) IN ('oz', 'kg', 'lb', 'g', 'ml', 'l', 'gal') THEN unit_of_measure
    
    -- Regular plurals (strip trailing 's' if not already singular)
    WHEN LOWER(unit_of_measure) LIKE '%s' AND LOWER(unit_of_measure) NOT IN ('oz', 'glass') THEN 
      LEFT(unit_of_measure, LENGTH(unit_of_measure) - 1)
    
    -- Default: keep as is
    ELSE unit_of_measure
  END
WHERE unit_of_measure IS NOT NULL;

-- Create a view to review conversions
CREATE OR REPLACE VIEW unit_conversion_review AS
SELECT 
  unit_of_measure_original as original,
  unit_of_measure as converted,
  COUNT(*) as item_count
FROM items
WHERE unit_of_measure_original != unit_of_measure
GROUP BY unit_of_measure_original, unit_of_measure
ORDER BY item_count DESC;

-- Add comment
COMMENT ON COLUMN items.unit_of_measure IS 'Unit of measure in singular form (e.g., lid, box, cup). Will be pluralized in UI based on quantity.';
COMMENT ON COLUMN items.unit_of_measure_original IS 'Backup of original unit_of_measure before singularization migration. Can be dropped after verification.';

-- Instructions:
-- 1. Run this migration
-- 2. Review conversions: SELECT * FROM unit_conversion_review;
-- 3. Manually fix any incorrect conversions
-- 4. After verification, optionally drop backup column:
--    ALTER TABLE items DROP COLUMN unit_of_measure_original;

-- Migration: Consolidate barcode_number into barcode column
-- This script merges the redundant barcode_number column back into the original barcode column

-- Step 1: Copy any non-null barcode_number values to barcode (where barcode is null)
UPDATE items 
SET barcode = barcode_number 
WHERE barcode_number IS NOT NULL 
  AND (barcode IS NULL OR barcode = '');

-- Step 2: For items where BOTH columns have values, keep barcode_number (the generated one)
-- This assumes barcode_number is the "source of truth" for generated barcodes
UPDATE items 
SET barcode = barcode_number 
WHERE barcode_number IS NOT NULL 
  AND barcode IS NOT NULL 
  AND barcode != '';

-- Step 3: Drop the index on barcode_number
DROP INDEX IF EXISTS idx_items_barcode_number;

-- Step 4: Drop the barcode_number column (optional - uncomment if you want to remove it completely)
-- ALTER TABLE items DROP COLUMN IF EXISTS barcode_number;

-- Note: The column drop is commented out in case you want to keep it temporarily for rollback purposes
-- You can manually drop it later once you've verified everything works correctly

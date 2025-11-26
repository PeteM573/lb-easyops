-- Add barcode_number column to items table for printable barcodes
-- This is separate from the 'barcode' field (which stores scanned barcodes)

ALTER TABLE items 
ADD COLUMN IF NOT EXISTS barcode_number text UNIQUE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_items_barcode_number ON items(barcode_number);

-- Optional: Generate barcode numbers for existing items (if any exist without them)
-- You can run this manually if needed, or skip if all items will get barcodes going forward

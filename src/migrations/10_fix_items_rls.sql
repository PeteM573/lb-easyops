-- Fix RLS policies for items table to allow employees to add and update items
-- This migration ensures all authenticated users can manage inventory items

-- Drop existing policies if any
DROP POLICY IF EXISTS "Allow authenticated users to view items" ON items;
DROP POLICY IF EXISTS "Allow authenticated users to insert items" ON items;
DROP POLICY IF EXISTS "Allow authenticated users to update items" ON items;
DROP POLICY IF EXISTS "Allow managers to delete items" ON items;

-- Enable RLS on items table (if not already enabled)
ALTER TABLE items ENABLE ROW LEVEL SECURITY;

-- Policy: All authenticated users can view items
CREATE POLICY "Allow authenticated users to view items"
  ON items
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: All authenticated users can insert items
CREATE POLICY "Allow authenticated users to insert items"
  ON items
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: All authenticated users can update items
CREATE POLICY "Allow authenticated users to update items"
  ON items
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy: Only managers/admins can delete items
CREATE POLICY "Allow managers to delete items"
  ON items
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.role ILIKE 'manager' OR profiles.role ILIKE 'admin')
    )
  );

-- Also ensure item_locations has proper RLS policies
DROP POLICY IF EXISTS "Allow authenticated users to view item locations" ON item_locations;
DROP POLICY IF EXISTS "Allow authenticated users to insert item locations" ON item_locations;
DROP POLICY IF EXISTS "Allow authenticated users to update item locations" ON item_locations;
DROP POLICY IF EXISTS "Allow authenticated users to delete item locations" ON item_locations;

ALTER TABLE item_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to view item locations"
  ON item_locations
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert item locations"
  ON item_locations
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update item locations"
  ON item_locations
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete item locations"
  ON item_locations
  FOR DELETE
  TO authenticated
  USING (true);

COMMENT ON POLICY "Allow authenticated users to view items" ON items IS 'All logged-in users can view inventory items';
COMMENT ON POLICY "Allow authenticated users to insert items" ON items IS 'All logged-in users can create new inventory items';
COMMENT ON POLICY "Allow authenticated users to update items" ON items IS 'All logged-in users can update inventory items';
COMMENT ON POLICY "Allow managers to delete items" ON items IS 'Only managers and admins can delete inventory items';

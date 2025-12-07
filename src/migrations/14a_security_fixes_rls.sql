-- ============================================================================
-- PART 1 of 3: RLS POLICIES FOR TABLES
-- Run this first, then test before continuing
-- ============================================================================

-- 1. webhook_events Table
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Managers can view webhook events"
  ON webhook_events FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.role ILIKE 'manager' OR profiles.role ILIKE 'admin')
    )
  );

CREATE POLICY "Service role can insert webhook events"
  ON webhook_events FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 2. item_dates Table
ALTER TABLE item_dates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view item dates"
  ON item_dates FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create item dates"
  ON item_dates FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update item dates"
  ON item_dates FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Managers can delete item dates"
  ON item_dates FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.role ILIKE 'manager' OR profiles.role ILIKE 'admin')
    )
  );

-- 3. general_dates Table
ALTER TABLE general_dates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view general dates"
  ON general_dates FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create general dates"
  ON general_dates FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update general dates"
  ON general_dates FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Managers can delete general dates"
  ON general_dates FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.role ILIKE 'manager' OR profiles.role ILIKE 'admin')
    )
  );

-- 4. locations Table
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view locations"
  ON locations FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create locations"
  ON locations FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update locations"
  ON locations FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Managers can delete locations"
  ON locations FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.role ILIKE 'manager' OR profiles.role ILIKE 'admin')
    )
  );

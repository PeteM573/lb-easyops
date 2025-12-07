-- ============================================================================
-- PART 3 of 3: TRIGGER FUNCTIONS & VIEW
-- Run this after Parts 1 & 2 succeed
-- ============================================================================

-- Trigger functions - use CREATE OR REPLACE (don't drop due to trigger dependencies)

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, role)
    VALUES (NEW.id, 'employee');
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION set_task_completed_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.is_complete = true AND (OLD.is_complete = false OR OLD.is_complete IS NULL) THEN
    NEW.completed_at = NOW();
  ELSIF NEW.is_complete = false AND OLD.is_complete = true THEN
    NEW.completed_at = NULL;
  END IF;
  RETURN NEW;
END;
$$;

-- Fix view security
DROP VIEW IF EXISTS unit_conversion_review;

CREATE VIEW unit_conversion_review AS
SELECT 
  unit_of_measure_original as original,
  unit_of_measure as converted,
  COUNT(*) as item_count
FROM items
WHERE unit_of_measure_original IS NOT NULL 
  AND unit_of_measure_original != unit_of_measure
GROUP BY unit_of_measure_original, unit_of_measure
ORDER BY item_count DESC;

COMMENT ON VIEW unit_conversion_review IS 'Review view for unit singularization migration';

-- Add completed_at timestamp to tasks table for shift-based filtering
-- This allows us to show only recently completed tasks (last 24 hours)

-- Add completed_at column
ALTER TABLE tasks 
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- Create index for efficient filtering
CREATE INDEX IF NOT EXISTS idx_tasks_completed_at 
  ON tasks(completed_at) 
  WHERE completed_at IS NOT NULL;

-- Create a trigger to automatically set completed_at when task is marked complete
CREATE OR REPLACE FUNCTION set_task_completed_at()
RETURNS TRIGGER AS $$
BEGIN
  -- If task is being marked as complete and wasn't complete before
  IF NEW.is_complete = true AND (OLD.is_complete = false OR OLD.is_complete IS NULL) THEN
    NEW.completed_at = NOW();
  -- If task is being marked as incomplete, clear completed_at
  ELSIF NEW.is_complete = false AND OLD.is_complete = true THEN
    NEW.completed_at = NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and create new one
DROP TRIGGER IF EXISTS trigger_set_task_completed_at ON tasks;

CREATE TRIGGER trigger_set_task_completed_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION set_task_completed_at();

COMMENT ON COLUMN tasks.completed_at IS 'Timestamp when task was marked as complete, used for shift-based filtering';
COMMENT ON FUNCTION set_task_completed_at() IS 'Automatically sets completed_at timestamp when task is marked complete';

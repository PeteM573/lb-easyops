-- Add force_password_change flag for first-time user password reset

ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS force_password_change BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_profiles_force_password_change 
  ON profiles(force_password_change) 
  WHERE force_password_change = true;

COMMENT ON COLUMN profiles.force_password_change IS 'When true, user must change password on next login';

-- Add 'individual' to family_role enum for single/unmarried members
-- This allows proper representation of solo members without needing spouse/parent

ALTER TYPE family_role ADD VALUE IF NOT EXISTS 'individual';

-- Add comment explaining the role
COMMENT ON TYPE family_role IS 'Role of a member within a family unit. "individual" is for single/unmarried members who form their own family unit.';

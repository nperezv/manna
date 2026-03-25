-- Add hidden_subs column to families
ALTER TABLE families ADD COLUMN IF NOT EXISTS hidden_subs jsonb DEFAULT '[]';
ALTER TABLE families ADD COLUMN IF NOT EXISTS renamed_subs jsonb DEFAULT '{}';

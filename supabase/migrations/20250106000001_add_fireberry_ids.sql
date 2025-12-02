-- Add fireberry_id column to cohorts table to store Fireberry cohort ID
ALTER TABLE cohorts ADD COLUMN IF NOT EXISTS fireberry_id UUID UNIQUE;

-- Add fireberry_id column to students table to store Fireberry student ID (pcfLeadObjId)
ALTER TABLE students ADD COLUMN IF NOT EXISTS fireberry_id UUID UNIQUE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_cohorts_fireberry_id ON cohorts(fireberry_id);
CREATE INDEX IF NOT EXISTS idx_students_fireberry_id ON students(fireberry_id);


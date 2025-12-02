-- Create cohorts table
CREATE TABLE IF NOT EXISTS cohorts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create students table
CREATE TABLE IF NOT EXISTS students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cohort_id UUID REFERENCES cohorts(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create lessons table
CREATE TABLE IF NOT EXISTS lessons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cohort_id UUID REFERENCES cohorts(id) ON DELETE CASCADE,
    lesson_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(cohort_id, lesson_date)
);

-- Create attendance table
CREATE TABLE IF NOT EXISTS attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    attended BOOLEAN DEFAULT FALSE,
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(lesson_id, student_id)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_attendance_lesson ON attendance(lesson_id);
CREATE INDEX IF NOT EXISTS idx_attendance_student ON attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_lessons_cohort_date ON lessons(cohort_id, lesson_date);
CREATE INDEX IF NOT EXISTS idx_students_cohort ON students(cohort_id);

-- Enable Row Level Security (RLS)
ALTER TABLE cohorts ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

-- Create policies (allow all for authenticated users, for now we'll use service role)
-- For development, we'll allow all operations
CREATE POLICY "Allow all for authenticated" ON cohorts FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated" ON students FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated" ON lessons FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated" ON attendance FOR ALL USING (true);

-- Insert mock cohort
INSERT INTO cohorts (id, name) VALUES 
    ('00000000-0000-0000-0000-000000000001', 'Cohort 1')
ON CONFLICT DO NOTHING;

-- Insert mock students
INSERT INTO students (id, cohort_id, name) VALUES
    ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'תלמיד 1'),
    ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'תלמיד 2'),
    ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'תלמיד 3'),
    ('10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'תלמיד 4'),
    ('10000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'תלמיד 5'),
    ('10000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000001', 'תלמיד 6'),
    ('10000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000001', 'תלמיד 7'),
    ('10000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000001', 'תלמיד 8'),
    ('10000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000001', 'תלמיד 9'),
    ('10000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001', 'תלמיד 10')
ON CONFLICT DO NOTHING;


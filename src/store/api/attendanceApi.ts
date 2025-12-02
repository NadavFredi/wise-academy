import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { supabase } from '@/lib/supabase';

export interface Student {
  id: string;
  name: string;
  cohort_id: string;
}


// Get Supabase URL for edge functions
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'http://localhost:54321';
const SUPABASE_SYNC_FUNCTION_URL = `${supabaseUrl}/functions/v1/sync-fireberry`;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

export interface Lesson {
  id: string;
  lesson_date: string;
  cohort_id: string;
}

export interface AttendanceRecord {
  id: string;
  lesson_id: string;
  student_id: string;
  attended: boolean;
  note: string | null;
}

export const attendanceApi = createApi({
  reducerPath: 'attendanceApi',
  baseQuery: fetchBaseQuery({ baseUrl: '' }),
  tagTypes: ['Students', 'Lessons', 'Attendance'],
  endpoints: (builder) => ({
    syncAll: builder.mutation<
      { cohortsSynced: number; studentsSynced: number; message: string },
      void
    >({
      queryFn: async () => {
        try {
          const response = await fetch(SUPABASE_SYNC_FUNCTION_URL, {
            method: 'POST',
            headers: {
              'accept': 'application/json',
              'content-type': 'application/json',
              'apikey': supabaseAnonKey,
              'Authorization': `Bearer ${supabaseAnonKey}`,
            },
            body: JSON.stringify({
              action: 'syncAll',
            }),
          });

          if (!response.ok) {
            throw new Error(`Sync function error: ${response.status} ${response.statusText}`);
          }

          const result = await response.json();

          if (!result.success) {
            throw new Error(result.error || 'Failed to sync data');
          }

          return { data: result.data };
        } catch (error) {
          console.error('Error syncing all data:', error);
          return { error: error as Error };
        }
      },
      invalidatesTags: ['Students', 'Cohorts'],
    }),
    getStudents: builder.query<Student[], string>({
      queryFn: async (cohortId) => {
        if (!cohortId) {
          return { data: [] };
        }

        try {
          // First, get the local cohort ID from fireberry_id
          const { data: cohort, error: cohortError } = await supabase
            .from('cohorts')
            .select('id')
            .eq('fireberry_id', cohortId)
            .maybeSingle(); // Use maybeSingle to avoid 406 error when not found

          if (cohortError) {
            // Check if it's a "not found" error (PGRST116)
            if (cohortError.code === 'PGRST116') {
              return { data: [] };
            }
            // For other errors, log and return empty
            console.error('Error fetching cohort:', cohortError);
            return { data: [] };
          }

          if (!cohort) {
            return { data: [] };
          }

          // Fetch students from Supabase
          const { data: students, error: studentsError } = await supabase
            .from('students')
            .select('id, name, cohort_id')
            .eq('cohort_id', cohort.id)
            .order('name', { ascending: true });

          if (studentsError) throw studentsError;

          return { data: students || [] };
        } catch (error) {
          console.error('Error fetching students:', error);
          return { error: error as Error };
        }
      },
      providesTags: ['Students'],
    }),
    getLessons: builder.query<Lesson[], string>({
      queryFn: async (cohortId) => {
        const { data, error } = await supabase
          .from('lessons')
          .select('*')
          .eq('cohort_id', cohortId)
          .order('lesson_date', { ascending: false });
        if (error) throw error;
        return { data: data || [] };
      },
      providesTags: ['Lessons'],
    }),
    getAttendance: builder.query<AttendanceRecord[], string[]>({
      queryFn: async (lessonIds) => {
        if (lessonIds.length === 0) return { data: [] };
        const { data, error } = await supabase
          .from('attendance')
          .select('*')
          .in('lesson_id', lessonIds);
        if (error) throw error;
        return { data: data || [] };
      },
      providesTags: ['Attendance'],
    }),
    createLesson: builder.mutation<Lesson, { cohortId: string; lessonDate: string }>({
      queryFn: async ({ cohortId, lessonDate }) => {
        const { data, error } = await supabase
          .from('lessons')
          .insert({ cohort_id: cohortId, lesson_date: lessonDate })
          .select()
          .single();
        if (error) throw error;
        return { data };
      },
      invalidatesTags: ['Lessons'],
    }),
    updateLesson: builder.mutation<Lesson, { lessonId: string; lessonDate: string }>({
      queryFn: async ({ lessonId, lessonDate }) => {
        const { data, error } = await supabase
          .from('lessons')
          .update({ lesson_date: lessonDate })
          .eq('id', lessonId)
          .select()
          .single();
        if (error) throw error;
        return { data };
      },
      invalidatesTags: ['Lessons', 'Attendance'],
    }),
    deleteLesson: builder.mutation<void, string>({
      queryFn: async (lessonId) => {
        const { error } = await supabase
          .from('lessons')
          .delete()
          .eq('id', lessonId);
        if (error) throw error;
        return { data: undefined };
      },
      invalidatesTags: ['Lessons', 'Attendance'],
    }),
    updateAttendance: builder.mutation<
      AttendanceRecord,
      { lessonId: string; studentId: string; attended: boolean; note?: string }
    >({
      queryFn: async ({ lessonId, studentId, attended, note }) => {
        // Check if record exists
        const { data: existing } = await supabase
          .from('attendance')
          .select('*')
          .eq('lesson_id', lessonId)
          .eq('student_id', studentId)
          .single();

        if (existing) {
          // Update existing
          const { data, error } = await supabase
            .from('attendance')
            .update({ attended, note: note ?? null, updated_at: new Date().toISOString() })
            .eq('id', existing.id)
            .select()
            .single();
          if (error) throw error;
          return { data };
        } else {
          // Create new
          const { data, error } = await supabase
            .from('attendance')
            .insert({ lesson_id: lessonId, student_id: studentId, attended, note: note ?? null })
            .select()
            .single();
          if (error) throw error;
          return { data };
        }
      },
      invalidatesTags: ['Attendance'],
    }),
    bulkUpdateAttendance: builder.mutation<
      AttendanceRecord[],
      Array<{ lessonId: string; studentId: string; attended: boolean; note?: string }>
    >({
      queryFn: async (updates) => {
        if (updates.length === 0) {
          return { data: [] };
        }

        // Prepare data for upsert - convert to format expected by Supabase
        const upsertData = updates.map(update => ({
          lesson_id: update.lessonId,
          student_id: update.studentId,
          attended: update.attended,
          note: update.note ?? null,
          updated_at: new Date().toISOString(),
        }));

        // Use upsert with conflict resolution on lesson_id and student_id
        // This will update existing records or insert new ones
        const { data, error } = await supabase
          .from('attendance')
          .upsert(upsertData, {
            onConflict: 'lesson_id,student_id',
            ignoreDuplicates: false,
          })
          .select();

        if (error) throw error;
        return { data: data || [] };
      },
      invalidatesTags: ['Attendance'],
    }),
  }),
});

export const {
  useGetStudentsQuery,
  useGetLessonsQuery,
  useGetAttendanceQuery,
  useCreateLessonMutation,
  useUpdateLessonMutation,
  useDeleteLessonMutation,
  useUpdateAttendanceMutation,
  useBulkUpdateAttendanceMutation,
  useSyncAllMutation,
} = attendanceApi;


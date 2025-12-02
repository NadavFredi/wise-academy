import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { supabase } from '@/lib/supabase';

export interface Student {
  id: string;
  name: string;
  cohort_id: string;
}

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
    getStudents: builder.query<Student[], string>({
      queryFn: async (cohortId) => {
        const { data, error } = await supabase
          .from('students')
          .select('*')
          .eq('cohort_id', cohortId)
          .order('name');
        if (error) throw error;
        return { data: data || [] };
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
} = attendanceApi;


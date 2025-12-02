import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { supabase } from '@/lib/supabase';

export interface Student {
  id: string;
  name: string;
  cohort_id: string;
}

interface FireberryQueryResponse {
  success: boolean;
  data: {
    ObjectName: string;
    SystemName: string;
    PrimaryKey: string;
    PrimaryField: string;
    ObjectType: number;
    PageNum: number;
    SortBy: string;
    SortBy_Desc: boolean;
    IsLastPage: boolean;
    Columns: Array<{
      name: string;
      fieldname: string;
      systemfieldtypeid: string;
      fieldobjecttype: number | null;
      isprimaryfield: boolean;
      isrequired: boolean;
      isreadonly: boolean;
      maxlength: number | null;
    }>;
    Data: Array<Record<string, any>>;
  };
  message: string;
}

interface FireberryQueryRequest {
  page_size: number;
  page_number?: number;
  query?: string;
  fields?: string;
  objecttype: number | string;
}

// Get Supabase URL for edge functions
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'http://localhost:54321';
const SUPABASE_FUNCTION_URL = `${supabaseUrl}/functions/v1/fireberry-proxy`;
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
    getStudents: builder.query<Student[], string>({
      queryFn: async (cohortId) => {
        if (!cohortId) {
          return { data: [] };
        }

        try {
          const response = await fetch(SUPABASE_FUNCTION_URL, {
            method: 'POST',
            headers: {
              'accept': 'application/json',
              'content-type': 'application/json',
              'apikey': supabaseAnonKey,
              'Authorization': `Bearer ${supabaseAnonKey}`,
            },
            body: JSON.stringify({
              query: `(pcfCohort = ${cohortId})`,
              fields: "pcfFullName,pcfLeadObjId",
              page_size: 500,
              objecttype: "1002",
            } as FireberryQueryRequest),
          });

          if (!response.ok) {
            throw new Error(`Fireberry API error: ${response.status} ${response.statusText}`);
          }

          const fireberryResponse: FireberryQueryResponse = await response.json();

          if (!fireberryResponse.success || !fireberryResponse.data?.Data) {
            return { data: [] };
          }

          const students: Student[] = fireberryResponse.data.Data.map((item) => ({
            id: item.pcfLeadObjId || '',
            name: item.pcfFullName || '',
            cohort_id: cohortId,
          })).filter((student) => student.id && student.name);

          // Sort by name
          students.sort((a, b) => a.name.localeCompare(b.name, 'he'));

          return { data: students };
        } catch (error) {
          console.error('Error fetching students from Fireberry:', error);
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


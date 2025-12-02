import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { supabase } from '@/lib/supabase';

export interface Cohort {
  id: string;
  fireberry_id: string;
  name: string;
  // For compatibility with existing code that uses customobject1004id
  customobject1004id: string;
  pcfCoursename: string;
}

export interface Student {
  id: string;
  name: string;
  cohort_id: string;
}

export const cohortsApi = createApi({
  reducerPath: 'cohortsApi',
  baseQuery: fetchBaseQuery({ baseUrl: '' }),
  tagTypes: ['Cohorts'],
  endpoints: (builder) => ({
    getCohorts: builder.query<Cohort[], void>({
      queryFn: async () => {
        try {
          const { data, error } = await supabase
            .from('cohorts')
            .select('id, fireberry_id, name')
            .order('name', { ascending: true });

          if (error) throw error;

          // Transform to match existing interface
          const cohorts: Cohort[] = (data || []).map((cohort) => ({
            id: cohort.id,
            fireberry_id: cohort.fireberry_id,
            name: cohort.name,
            customobject1004id: cohort.fireberry_id, // For compatibility
            pcfCoursename: '', // We don't store this separately, it's in the name
          }));

          return { data: cohorts };
        } catch (error) {
          console.error('Error fetching cohorts:', error);
          return { error: error as Error };
        }
      },
      providesTags: ['Cohorts'],
    }),
    getStudentsByCohort: builder.query<Student[], string>({
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
      providesTags: ['Cohorts'],
    }),
  }),
});

export const { useGetCohortsQuery, useGetStudentsByCohortQuery } = cohortsApi;

// Custom hook for easier usage
export const useCohorts = () => {
  const { data: cohorts = [], isLoading, error } = useGetCohortsQuery();
  
  return {
    cohorts,
    isLoading,
    error,
  };
};


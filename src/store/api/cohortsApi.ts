import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

// Get Supabase URL for edge functions
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'http://localhost:54321';
const SUPABASE_FUNCTION_URL = `${supabaseUrl}/functions/v1/fireberry-proxy`;

export interface Cohort {
  customobject1004id: string;
  name: string;
  pcfCoursename: string;
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
  page_number: number;
  objecttype: number;
}

const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

export const cohortsApi = createApi({
  reducerPath: 'cohortsApi',
  baseQuery: fetchBaseQuery({
    baseUrl: SUPABASE_FUNCTION_URL,
    prepareHeaders: (headers) => {
      // Add Supabase anon key for edge function authentication
      headers.set('apikey', supabaseAnonKey);
      headers.set('Authorization', `Bearer ${supabaseAnonKey}`);
      return headers;
    },
  }),
  tagTypes: ['Cohorts'],
  endpoints: (builder) => ({
    getCohorts: builder.query<Cohort[], void>({
      query: () => ({
        url: '',
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'content-type': 'application/json',
        },
        body: {
          page_size: 50,
          page_number: 1,
          objecttype: 1004,
        } as FireberryQueryRequest,
      }),
      transformResponse: (response: FireberryQueryResponse): Cohort[] => {
        if (!response.success || !response.data?.Data) {
          return [];
        }

        return response.data.Data.map((item) => ({
          customobject1004id: item.customobject1004id || '',
          name: item.name || '',
          pcfCoursename: item.pcfCoursename || '',
        })).filter((cohort) => cohort.name && cohort.customobject1004id);
      },
      providesTags: ['Cohorts'],
    }),
  }),
});

export const { useGetCohortsQuery } = cohortsApi;

// Custom hook for easier usage
export const useCohorts = () => {
  const { data: cohorts = [], isLoading, error } = useGetCohortsQuery();
  
  return {
    cohorts,
    isLoading,
    error,
  };
};


import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const FIREBERRY_API_URL = 'https://api.fireberry.com/api/query'
const FIREBERRY_TOKEN = Deno.env.get('FIREBERRY_TOKEN') || '8ff57eb1-ba35-4c04-bb32-11772f41268e'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const { action, cohortId, cohortName } = await req.json()

    if (action === 'syncAll') {
      // Fetch all cohorts from Fireberry
      const cohortsResponse = await fetch(FIREBERRY_API_URL, {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'content-type': 'application/json',
          'tokenid': FIREBERRY_TOKEN,
        },
        body: JSON.stringify({
          query: "pcfShouldShowOnAttendanceSystem = 1",
          page_size: 500,
          objecttype: 1004,
        }),
      })

      if (!cohortsResponse.ok) {
        throw new Error(`Fireberry API error: ${cohortsResponse.status} ${cohortsResponse.statusText}`)
      }

      const cohortsFireberryResponse = await cohortsResponse.json()

      if (!cohortsFireberryResponse.success || !cohortsFireberryResponse.data?.Data) {
        return new Response(
          JSON.stringify({ success: true, data: { cohortsSynced: 0, studentsSynced: 0 } }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          },
        )
      }

      const fireberryCohorts = cohortsFireberryResponse.data.Data.map((item: any) => ({
        fireberry_id: item.customobject1004id || '',
        name: item.name || '',
        pcfCoursename: item.pcfCoursename || '',
      })).filter((c: any) => c.fireberry_id && c.name)

      let cohortsSynced = 0
      let studentsSynced = 0

      // Sync each cohort
      for (const fireberryCohort of fireberryCohorts) {
        const cohortName = fireberryCohort.pcfCoursename
          ? `${fireberryCohort.name} - ${fireberryCohort.pcfCoursename}`
          : fireberryCohort.name

        // Check if cohort exists
        const { data: existingCohort } = await supabase
          .from('cohorts')
          .select('id, fireberry_id, name')
          .eq('fireberry_id', fireberryCohort.fireberry_id)
          .single()

        let cohortId: string

        if (existingCohort) {
          cohortId = existingCohort.id
        } else {
          // Create new cohort
          const { data: newCohort, error: cohortError } = await supabase
            .from('cohorts')
            .insert({
              fireberry_id: fireberryCohort.fireberry_id,
              name: cohortName,
            })
            .select('id, fireberry_id, name')
            .single()

          if (cohortError) {
            console.error(`Error creating cohort ${cohortName}:`, cohortError)
            continue
          }

          cohortId = newCohort.id
          cohortsSynced++
        }

        // Fetch students for this cohort from Fireberry
        const studentsResponse = await fetch(FIREBERRY_API_URL, {
          method: 'POST',
          headers: {
            'accept': 'application/json',
            'content-type': 'application/json',
            'tokenid': FIREBERRY_TOKEN,
          },
          body: JSON.stringify({
            query: `(pcfCohort = ${fireberryCohort.fireberry_id})`,
            fields: "pcfFullName,pcfLeadObjId",
            page_size: 500,
            objecttype: "1002",
          }),
        })

        if (!studentsResponse.ok) {
          console.error(`Error fetching students for cohort ${cohortName}:`, studentsResponse.statusText)
          continue
        }

        const studentsFireberryResponse = await studentsResponse.json()

        if (!studentsFireberryResponse.success || !studentsFireberryResponse.data?.Data) {
          continue
        }

        const fireberryStudents = studentsFireberryResponse.data.Data.map((item: any) => ({
          fireberry_id: item.pcfLeadObjId || '',
          name: item.pcfFullName || '',
        })).filter((s: any) => s.fireberry_id && s.name)

        // Sync each student (additive only)
        for (const fireberryStudent of fireberryStudents) {
          // Check if student exists
          const { data: existingStudent } = await supabase
            .from('students')
            .select('id, name, cohort_id, fireberry_id')
            .eq('fireberry_id', fireberryStudent.fireberry_id)
            .single()

          if (!existingStudent) {
            // Create new student
            const { error: insertError } = await supabase
              .from('students')
              .insert({
                fireberry_id: fireberryStudent.fireberry_id,
                name: fireberryStudent.name,
                cohort_id: cohortId,
              })

            if (insertError) {
              console.error(`Error creating student ${fireberryStudent.name}:`, insertError)
              continue
            }

            studentsSynced++
          }
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          data: {
            cohortsSynced,
            studentsSynced,
            message: `Synced ${cohortsSynced} cohorts and ${studentsSynced} students`,
          },
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        },
      )
    }

    if (action === 'syncCohort') {
      // Sync cohort to database
      const { data: existingCohort } = await supabase
        .from('cohorts')
        .select('id, fireberry_id, name')
        .eq('fireberry_id', cohortId)
        .single()

      if (existingCohort) {
        return new Response(
          JSON.stringify({ success: true, data: existingCohort }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          },
        )
      }

      // Create new cohort
      const { data: newCohort, error } = await supabase
        .from('cohorts')
        .insert({
          fireberry_id: cohortId,
          name: cohortName,
        })
        .select('id, fireberry_id, name')
        .single()

      if (error) {
        throw new Error(`Error creating cohort: ${error.message}`)
      }

      return new Response(
        JSON.stringify({ success: true, data: newCohort }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        },
      )
    }

    if (action === 'syncStudents') {
      // Fetch students from Fireberry
      const response = await fetch(FIREBERRY_API_URL, {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'content-type': 'application/json',
          'tokenid': FIREBERRY_TOKEN,
        },
        body: JSON.stringify({
          query: `(pcfCohort = ${cohortId})`,
          fields: "pcfFullName,pcfLeadObjId",
          page_size: 500,
          objecttype: "1002",
        }),
      })

      if (!response.ok) {
        throw new Error(`Fireberry API error: ${response.status} ${response.statusText}`)
      }

      const fireberryResponse = await response.json()

      if (!fireberryResponse.success || !fireberryResponse.data?.Data) {
        return new Response(
          JSON.stringify({ success: true, data: [] }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          },
        )
      }

      // Get cohort from DB
      const { data: cohort } = await supabase
        .from('cohorts')
        .select('id, fireberry_id')
        .eq('fireberry_id', cohortId)
        .single()

      if (!cohort) {
        throw new Error(`Cohort with fireberry_id ${cohortId} not found in database`)
      }

      const fireberryStudents = fireberryResponse.data.Data.map((item: any) => ({
        fireberry_id: item.pcfLeadObjId || '',
        name: item.pcfFullName || '',
      })).filter((s: any) => s.fireberry_id && s.name)

      const syncedStudents: any[] = []

      // Sync each student
      for (const fireberryStudent of fireberryStudents) {
        // Check if student exists
        const { data: existingStudent } = await supabase
          .from('students')
          .select('id, name, cohort_id, fireberry_id')
          .eq('fireberry_id', fireberryStudent.fireberry_id)
          .single()

        if (existingStudent) {
          syncedStudents.push({
            id: existingStudent.id,
            name: existingStudent.name,
            cohort_id: existingStudent.cohort_id,
          })
        } else {
          // Create new student
          const { data: newStudent, error: insertError } = await supabase
            .from('students')
            .insert({
              fireberry_id: fireberryStudent.fireberry_id,
              name: fireberryStudent.name,
              cohort_id: cohort.id,
            })
            .select('id, name, cohort_id')
            .single()

          if (insertError) {
            console.error('Error creating student:', insertError)
            continue
          }

          syncedStudents.push({
            id: newStudent.id,
            name: newStudent.name,
            cohort_id: newStudent.cohort_id,
          })
        }
      }

      // Sort by name (Hebrew locale)
      syncedStudents.sort((a, b) => a.name.localeCompare(b.name, 'he'))

      return new Response(
        JSON.stringify({ success: true, data: syncedStudents }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        },
      )
    }

    return new Response(
      JSON.stringify({ success: false, error: 'Invalid action' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  } catch (error: any) {
    console.error('Error in sync function:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        message: 'Failed to sync data',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})


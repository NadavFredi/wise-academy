import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

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
    // Parse request body
    const body = await req.json()
    
    // Forward the request to Fireberry API
    const response = await fetch(FIREBERRY_API_URL, {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'content-type': 'application/json',
        'tokenid': FIREBERRY_TOKEN,
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      throw new Error(`Fireberry API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()

    // Return the response with CORS headers
    return new Response(
      JSON.stringify(data),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        status: 200,
      },
    )
  } catch (error) {
    console.error('Error proxying request:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        data: null,
        message: 'Failed to fetch from Fireberry API'
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        status: 500,
      },
    )
  }
})


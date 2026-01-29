
// @deno-types="https://esm.sh/@supabase/functions-js@2"
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Missing Supabase environment variables')
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

    let body;
    try {
        body = await req.json();
        if (typeof body === 'string') {
            body = JSON.parse(body);
        }
    } catch (e) {
        throw new Error('Invalid JSON body');
    }

    const { user_ids } = body

    if (!user_ids || !Array.isArray(user_ids)) {
      throw new Error('Invalid request body. Expected user_ids array.')
    }

    const results = []
    for (const id of user_ids) {
      // We try to delete, but we don't stop if one fails
      const { error } = await supabaseAdmin.auth.admin.deleteUser(id)
      if (error) {
        console.error(`Failed to delete user ${id}:`, error)
        results.push({ id, success: false, error: error.message })
      } else {
        results.push({ id, success: true })
      }
    }

    return new Response(
      JSON.stringify({ results }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Delete Driver Users Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    )
  }
})

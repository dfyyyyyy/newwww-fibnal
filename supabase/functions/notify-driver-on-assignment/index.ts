// This function has been deprecated and is no longer used.
// The Firebase Cloud Messaging system has been removed from the application.

// @deno-types="https://esm.sh/@supabase/functions-js@2"
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  return new Response(JSON.stringify({ message: 'This function is deprecated.' }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status: 410, // Gone
  });
});

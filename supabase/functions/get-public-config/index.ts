// @deno-types="https://esm.sh/@supabase/functions-js@2"
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Server configuration error: Missing Supabase credentials.');
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
    
    const body = await req.json();
    const { uid } = body;

    if (!uid) {
      throw new Error('Missing uid parameter.');
    }

    const [formConfigRes, pricingRes, routesRes, vehiclesRes] = await Promise.all([
      supabaseAdmin.from('form_configurations').select('fields, customizations').eq('uid', uid).maybeSingle(),
      supabaseAdmin.from('pricing_settings').select('*').eq('uid', uid).maybeSingle(),
      supabaseAdmin.from('flat_rate_routes').select('*').eq('uid', uid),
      supabaseAdmin.from('vehicles').select('*').eq('uid', uid)
    ]);

    if (formConfigRes.error || pricingRes.error || routesRes.error || vehiclesRes.error) {
      console.error('Error fetching config for', uid, {
        form: formConfigRes.error,
        pricing: pricingRes.error,
        routes: routesRes.error,
        vehicles: vehiclesRes.error
      });
      throw new Error('Failed to fetch configuration data.');
    }
    
    const responseData = {
        fields: formConfigRes.data?.fields || null,
        customizations: formConfigRes.data?.customizations || null,
        pricing: pricingRes.data || null,
        routes: routesRes.data || [],
        vehicles: vehiclesRes.data || [],
    };

    return new Response(JSON.stringify(responseData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Get Public Config Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});

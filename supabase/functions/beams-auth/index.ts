// supabase/functions/beams-auth/index.ts
// @deno-types="https://esm.sh/@supabase/functions-js@2"
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import PushNotifications from 'npm:@pusher/push-notifications-server@1.2.6';

declare const Deno: any;

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
    const instanceId = Deno.env.get('PUSHER_BEAMS_INSTANCE_ID');
    const secretKey = Deno.env.get('PUSHER_BEAMS_SECRET_KEY');

    if (!supabaseUrl || !serviceRoleKey || !instanceId || !secretKey) {
      throw new Error('Missing one or more required environment variables.');
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
    
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
        throw new Error('Missing Authorization header.');
    }
    
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError) throw userError;
    if (!user) throw new Error('User not found or JWT invalid.');
    
    const url = new URL(req.url);
    const userType = url.searchParams.get('user_type') || 'admin';
    const driverId = url.searchParams.get('driver_id');
    
    let beamsUserId;

    if (userType === 'driver' && driverId) {
        const { data: driverData, error: driverError } = await supabaseAdmin
            .from('drivers')
            .select('id')
            .eq('user_id', user.id)
            .eq('id', driverId)
            .single();
        
        if (driverError || !driverData) {
            return new Response(JSON.stringify({ error: 'Unauthorized: Driver verification failed.' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 403,
            });
        }
        beamsUserId = `driver-${driverId}`;
    } else {
        beamsUserId = user.id; // Admin user
    }

    const beamsClient = new PushNotifications({ instanceId, secretKey });
    const beamsToken = beamsClient.generateToken(beamsUserId);

    return new Response(JSON.stringify(beamsToken), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});

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

const PAYPAL_API_BASE = Deno.env.get('PAYPAL_ENVIRONMENT') === 'live'
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com';
  
async function getPayPalAccessToken(clientId: string, clientSecret: string) {
  const auth = btoa(`${clientId}:${clientSecret}`);
  const response = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${auth}`,
    },
    body: 'grant_type=client_credentials',
  });
  const data = await response.json();
  if (!response.ok) throw new Error('Failed to get PayPal access token.');
  return data.access_token;
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
        if (!supabaseUrl || !serviceRoleKey) {
          throw new Error('Server configuration error.');
        }

        let body = await req.json();
        if (typeof body === 'string') {
          body = JSON.parse(body);
        }
        const { orderID, uid, bookingId } = body;

        if (!orderID || !uid || !bookingId) {
            throw new Error('Missing required parameters: orderID, uid, and bookingId are required.');
        }

        const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
        
        const { data: integrationData, error: integrationError } = await supabaseAdmin
            .from('payment_integrations')
            .select('paypal_client_id, paypal_client_secret')
            .eq('uid', uid)
            .single();

        if (integrationError || !integrationData?.paypal_client_id || !integrationData?.paypal_client_secret) {
            throw new Error('PayPal integration is not configured for this user.');
        }

        const accessToken = await getPayPalAccessToken(integrationData.paypal_client_id, integrationData.paypal_client_secret);
        
        const captureResponse = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders/${orderID}/capture`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
            },
        });

        const captureData = await captureResponse.json();
        
        if (!captureResponse.ok || captureData.status !== 'COMPLETED') {
            console.error("PayPal Capture Error:", captureData);
            // Optionally update booking status to 'Payment Failed'
            throw new Error(captureData.message || 'Failed to capture PayPal payment.');
        }

        // Payment successful, update booking status.
        const { error: updateError } = await supabaseAdmin
            .from('bookings')
            .update({ status: 'Scheduled' }) // Assuming 'Scheduled' is the status for a paid booking.
            .eq('id', bookingId)
            .eq('uid', uid);
        
        if (updateError) {
            // This is a critical error. The payment was captured but the booking wasn't updated.
            console.error(`CRITICAL: Payment for booking ${bookingId} was captured but DB update failed:`, updateError);
            throw new Error('Payment was successful, but there was an error updating your booking. Please contact support.');
        }

        return new Response(JSON.stringify({ success: true, message: 'Payment successful!' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });

    } catch (error) {
        console.error('Capture PayPal Order Function Error:', error);
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
        });
    }
});

export {};

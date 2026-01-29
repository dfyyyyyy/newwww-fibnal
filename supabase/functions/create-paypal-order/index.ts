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

// PayPal API base URL (sandbox or live)
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
  if (!response.ok) {
    console.error('PayPal Auth Error:', data);
    throw new Error('Failed to get PayPal access token.');
  }
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
      throw new Error('Server configuration error: Missing required Supabase environment variables.');
    }

    let body = await req.json();
    if (typeof body === 'string') {
      body = JSON.parse(body);
    }
    const { amount, bookingId, uid } = body;

    if (!uid || !amount || !bookingId) {
      throw new Error('Missing required parameters: uid, amount, and bookingId are required.');
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
    
    const { data: integrationData, error: integrationError } = await supabaseAdmin
        .from('payment_integrations')
        .select('paypal_client_id, paypal_client_secret')
        .eq('uid', uid)
        .single();

    if (integrationError || !integrationData?.paypal_client_id || !integrationData?.paypal_client_secret) {
        console.error('PayPal credentials not found for UID:', uid, 'Error:', integrationError);
        throw new Error('PayPal integration is not configured for this user.');
    }
    
    const accessToken = await getPayPalAccessToken(integrationData.paypal_client_id, integrationData.paypal_client_secret);
    
    const origin = req.headers.get('origin') || `https://${new URL(supabaseUrl).hostname.split('.')[0]}.vercel.app`;
    const returnUrl = `${origin}/booking/${bookingId}?paypal_success=true`;
    const cancelUrl = `${origin}/booking/${bookingId}?payment_cancelled=true`;

    const orderResponse = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
            intent: 'CAPTURE',
            purchase_units: [{
                amount: {
                    currency_code: 'USD',
                    value: amount.toFixed(2),
                },
                custom_id: `BOOKING-${bookingId}`,
            }],
            application_context: {
                return_url: returnUrl,
                cancel_url: cancelUrl,
                brand_name: 'ITS Booking System',
                shipping_preference: 'NO_SHIPPING',
                user_action: 'PAY_NOW',
            },
        }),
    });

    const orderData = await orderResponse.json();

    if (!orderResponse.ok) {
        console.error('PayPal Order Creation Error:', orderData);
        throw new Error(orderData.message || 'Failed to create PayPal order.');
    }

    const approvalLink = orderData.links.find((link: any) => link.rel === 'approve');

    if (!approvalLink) {
        throw new Error('Could not find PayPal approval link.');
    }
    
    // Store the PayPal order ID in the booking for later retrieval
    const { data: bookingData, error: getBookingError } = await supabaseAdmin.from('bookings').select('form_data').eq('id', bookingId).single();
    if(getBookingError) throw getBookingError;

    const newFormData = { ...(bookingData.form_data as object || {}), paypal_order_id: orderData.id };
    const { error: updateBookingError } = await supabaseAdmin.from('bookings').update({ form_data: newFormData }).eq('id', bookingId);

    if (updateBookingError) {
      console.error("Failed to store PayPal order ID:", updateBookingError);
      // Don't fail the whole transaction, but log it.
    }

    return new Response(JSON.stringify({ approvalUrl: approvalLink.href }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
    });

  } catch (error) {
    console.error('Create PayPal Order Function Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
    });
  }
});

export {};
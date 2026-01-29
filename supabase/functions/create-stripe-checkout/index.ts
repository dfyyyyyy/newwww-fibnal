// @deno-types="https://esm.sh/@supabase/functions-js@2"
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@15.12.0?target=deno';

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
    // Essential check for secrets
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceRoleKey) {
      console.error('Missing environment variables: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
      throw new Error('Server configuration error: Missing required environment variables.');
    }
    
    let body = await req.json();
    // The supabase client JS library can sometimes double-stringify the body.
    // This handles cases where the body is a stringified JSON instead of an object.
    if (typeof body === 'string') {
        body = JSON.parse(body);
    }
    const { amount, bookingId, customerEmail, uid } = body;

    if (!uid || !amount || !bookingId) {
      throw new Error('Missing required parameters: uid, amount, and bookingId are required.');
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
    
    const { data: integrationData, error: integrationError } = await supabaseAdmin
        .from('payment_integrations')
        .select('stripe_secret_key')
        .eq('uid', uid)
        .single();

    if (integrationError || !integrationData?.stripe_secret_key) {
        console.error('Stripe secret key not found for UID:', uid, 'Error:', integrationError);
        throw new Error('Stripe integration is not configured for this user.');
    }

    const stripe = new Stripe(integrationData.stripe_secret_key, {
        httpClient: Stripe.createFetchHttpClient(),
        apiVersion: '2024-06-20',
    });
    
    const origin = req.headers.get('origin') || `https://${new URL(supabaseUrl).hostname.split('.')[0]}.vercel.app`;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Booking #${bookingId}`,
            },
            unit_amount: Math.round(amount * 100),
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${origin}/booking/${bookingId}?payment_success=true`,
      cancel_url: `${origin}/booking/${bookingId}?payment_cancelled=true`,
      customer_email: customerEmail,
      metadata: {
          booking_id: String(bookingId),
          uid: uid,
      },
    });

    return new Response(JSON.stringify({ sessionUrl: session.url }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Stripe Checkout Function Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});

export {};
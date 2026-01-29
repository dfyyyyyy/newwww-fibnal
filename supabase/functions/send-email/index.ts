// @deno-types="https://esm.sh/@supabase/functions-js@2"
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Brevo API endpoint
const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // --- Environment and Auth Setup ---
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const brevoApiKey = Deno.env.get('BREVO_API_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Server configuration error: Missing Supabase credentials.');
    }
    if (!brevoApiKey) {
      throw new Error('Server configuration error: BREVO_API_KEY is not set in Supabase secrets.');
    }
    
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
    
    // --- Request Body Parsing ---
    let body = await req.json();
    if (typeof body === 'string') {
        body = JSON.parse(body);
    }
    const { to_email, subject, html_content, uid } = body;

    if (!to_email || !subject || !html_content || !uid) {
      throw new Error('Missing required parameters: to_email, subject, html_content, and uid are required.');
    }

    // --- Fetch Company Settings for Sender Info ---
    const { data: companySettings, error: settingsError } = await supabaseAdmin
        .from('company_settings')
        .select('company_name, contact_email')
        .eq('uid', uid)
        .single();
    
    if (settingsError) {
        console.warn(`Could not fetch company settings for UID ${uid}: ${settingsError.message}. Using default sender.`);
    }
    
    const senderName = companySettings?.company_name || 'ITS Booking System';
    // Use a verified domain or a default Brevo sender email
    const senderEmail = companySettings?.contact_email || 'noreply@its-booking.com';

    // --- Construct Brevo API Payload ---
    const emailPayload = {
      sender: {
        name: senderName,
        email: senderEmail,
      },
      to: [
        {
          email: to_email,
        },
      ],
      subject: subject,
      htmlContent: html_content,
    };

    // --- Send Email via Brevo ---
    const brevoResponse = await fetch(BREVO_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': brevoApiKey,
      },
      body: JSON.stringify(emailPayload),
    });

    if (!brevoResponse.ok) {
      const errorBody = await brevoResponse.json();
      console.error('Brevo API Error:', errorBody);
      throw new Error(`Failed to send email via Brevo: ${errorBody.message || 'Unknown error'}`);
    }

    return new Response(JSON.stringify({ success: true, message: 'Email sent successfully.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Send Email Function Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});

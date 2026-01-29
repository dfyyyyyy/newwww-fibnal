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

const DEFAULT_TEMPLATES: Record<string, { subject: string; body: string; }> = {
    customer_confirmation: {
        subject: 'Your Booking is Confirmed! (Booking #{{booking_id}})',
        body: `<h2>Your Ride is Confirmed!</h2>
<p>Hi {{customer_name}},</p>
<p>Thank you for booking with {{company_name}}. Your ride details are below:</p>
<ul style="list-style-type: none; padding: 0; margin-left: 0;">
    <li style="margin-bottom: 10px;"><strong>Booking ID:</strong> #{{booking_id}}</li>
    <li style="margin-bottom: 10px;"><strong>Pickup:</strong> {{pickup}}</li>
    <li style="margin-bottom: 10px;"><strong>Drop-off:</strong> {{dropoff}}</li>
    <li style="margin-bottom: 10px;"><strong>Time:</strong> {{datetime}}</li>
    <li style="margin-bottom: 10px;"><strong>Estimated Fare:</strong> \${{amount}}</li>
</ul>
<p>We will notify you when your driver is on the way. If you have any questions, feel free to contact us.</p>`
    },
    admin_new_booking: {
        subject: '[New Booking] Ride Request Received - #{{booking_id}}',
        body: `<h2>New Booking Notification</h2>
<p>A new booking has been submitted through your public form.</p>
<ul style="list-style-type: none; padding: 0; margin-left: 0;">
    <li style="margin-bottom: 10px;"><strong>Booking ID:</strong> #{{booking_id}}</li>
    <li style="margin-bottom: 10px;"><strong>Customer:</strong> {{customer_name}}</li>
    <li style="margin-bottom: 10px;"><strong>Contact:</strong> {{customer_contact}}</li>
    <li style="margin-bottom: 10px;"><strong>Pickup:</strong> {{pickup}}</li>
    <li style="margin-bottom: 10px;"><strong>Drop-off:</strong> {{dropoff}}</li>
    <li style="margin-bottom: 10px;"><strong>Time:</strong> {{datetime}}</li>
    <li style="margin-bottom: 10px;"><strong>Estimated Fare:</strong> \${{amount}}</li>
</ul>
<p>Please log in to the admin panel to review the details and assign a driver.</p>`
    }
};

const getTemplate = async (supabaseAdmin: any, userId: string, templateName: string): Promise<{ subject: string; body: string }> => {
    const { data } = await supabaseAdmin.from('email_templates').select('subject, body').eq('uid', userId).eq('template_name', templateName).single();
    return (data && data.subject && data.body) ? data : DEFAULT_TEMPLATES[templateName];
};

const replacePlaceholders = (template: string, replacements: Record<string, any>) => {
    let result = template;
    for (const key in replacements) {
        result = result.replace(new RegExp(`{{${key}}}`, 'g'), replacements[key] ?? '');
    }
    return result;
};

const createEmailTemplate = (content: string, companyName: string, companyLogoUrl: string | null): string => {
    const logoHtml = companyLogoUrl ? `<img src="${companyLogoUrl}" alt="${companyName} Logo" style="max-height: 70px; max-width: 200px;">` : `<h2>${companyName}</h2>`;
    return `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: auto; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
            <div style="background-color: #f4f4f4; padding: 20px; text-align: center;">
                ${logoHtml}
            </div>
            <div style="padding: 20px;">
                ${content}
            </div>
            <div style="background-color: #f4f4f4; padding: 15px; text-align: center; font-size: 12px; color: #777;">
                <p>${companyName} | This is an automated email. Please do not reply.</p>
            </div>
        </div>
    `;
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

    let body = await req.json();
    if (typeof body === 'string') {
        body = JSON.parse(body);
    }
    const { bookingId, uid } = body;

    if (!bookingId || !uid) {
        throw new Error('Missing bookingId or uid.');
    }

    const { data: booking, error: bookingError } = await supabaseAdmin
        .from('bookings')
        .select('*')
        .eq('id', bookingId)
        .eq('uid', uid)
        .single();
    
    if (bookingError || !booking) {
        throw new Error(`Booking not found or access denied. Error: ${bookingError?.message}`);
    }
    
    const { data: companySettings } = await supabaseAdmin.from('company_settings').select('company_name, contact_email').eq('uid', uid).single();
    const { data: formConfig } = await supabaseAdmin.from('form_configurations').select('customizations').eq('uid', uid).single();
    const companyName = companySettings?.company_name || 'Your Company';
    const companyLogo = (formConfig?.customizations as any)?.logo || null;
    
    const bookingTime = new Date((booking.form_data as any)?.datetime || booking.created_at).toLocaleString();
    const customerEmail = (booking.form_data as any)?.email;

    // Send confirmation to CUSTOMER
    if (customerEmail) {
        const template = await getTemplate(supabaseAdmin, uid, 'customer_confirmation');
        const replacements = {
            booking_id: booking.id, customer_name: booking.customer, pickup: booking.pickup,
            dropoff: booking.dropoff || 'N/A', datetime: bookingTime, amount: booking.amount, company_name: companyName,
        };
        const subject = replacePlaceholders(template.subject, replacements);
        const body = replacePlaceholders(template.body, replacements);
        const html_content = createEmailTemplate(body, companyName, companyLogo);

        await supabaseAdmin.functions.invoke('send-email', {
            body: { uid, to_email: customerEmail, subject, html_content },
        });
    } else {
        console.warn(`Booking ${bookingId} has no customer email. Skipping customer notification.`);
    }

    // Send notification to ADMIN
    const adminEmail = companySettings?.contact_email;
    if (adminEmail) {
        try {
            const template = await getTemplate(supabaseAdmin, uid, 'admin_new_booking');
            const replacements = {
                booking_id: booking.id, customer_name: booking.customer, pickup: booking.pickup,
                dropoff: booking.dropoff || 'N/A', datetime: bookingTime, amount: booking.amount,
                customer_contact: customerEmail || (booking.form_data as any)?.phone_number || 'Not Provided',
            };
            const subject = replacePlaceholders(template.subject, replacements);
            const body = replacePlaceholders(template.body, replacements);
            const html_content = createEmailTemplate(body, companyName, companyLogo);

            await supabaseAdmin.functions.invoke('send-email', {
                body: { uid, to_email: adminEmail, subject, html_content },
            });
        } catch (adminEmailError) {
            console.error('Failed to send admin notification email:', adminEmailError.message);
        }
    } else {
        console.warn(`Admin contact email not set for UID ${uid}. Skipping admin notification.`);
    }


    return new Response(JSON.stringify({ success: true, message: 'Notifications processed.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Send Booking Confirmation Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});

import { supabase } from './supabase';
import type { Booking, Driver, CompanySettings } from '../types';
import { Database } from './database.types';

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
    },
    driver_assignment: {
        subject: 'New Ride Assigned: Booking #{{booking_id}}',
        body: `<h2>New Ride Assignment</h2>
<p>Hi {{driver_name}},</p>
<p>A new ride from <strong>{{company_name}}</strong> has been assigned to you. Please log in to the driver portal for full details.</p>
<ul style="list-style-type: none; padding: 0; margin-left: 0;">
    <li style="margin-bottom: 10px;"><strong>Ride ID:</strong> #{{booking_id}}</li>
    <li style="margin-bottom: 10px;"><strong>Customer:</strong> {{customer_name}}</li>
    <li style="margin-bottom: 10px;"><strong>Pickup Location:</strong> {{pickup}}</li>
    <li style="margin-bottom: 10px;"><strong>Pickup Time:</strong> {{datetime}}</li>
</ul>`
    },
    driver_cancellation: {
        subject: 'Ride Cancelled: Booking #{{booking_id}}',
        body: `<h2>Ride Cancelled</h2>
<p>Hi {{driver_name}},</p>
<p>The following ride assigned to you has been cancelled by the admin:</p>
<ul style="list-style-type: none; padding: 0; margin-left: 0;">
    <li style="margin-bottom: 10px;"><strong>Ride ID:</strong> #{{booking_id}}</li>
    <li style="margin-bottom: 10px;"><strong>Original Pickup:</strong> {{pickup}}</li>
    <li style="margin-bottom: 10px;"><strong>Original Time:</strong> {{datetime}}</li>
</ul>
<p>This ride has been removed from your schedule. No action is needed from your side.</p>`
    },
    customer_cancellation: {
        subject: 'Your Booking Cancellation Confirmation (ID: #{{booking_id}})',
        body: `<h2>Booking Cancelled</h2>
<p>Hi {{customer_name}},</p>
<p>This email confirms that your booking with <strong>{{company_name}}</strong> has been successfully cancelled.</p>
<ul style="list-style-type: none; padding: 0; margin-left: 0;">
    <li style="margin-bottom: 10px;"><strong>Booking ID:</strong> #{{booking_id}}</li>
    <li style="margin-bottom: 10px;"><strong>Pickup:</strong> {{pickup}}</li>
</ul>
<p>We're sorry to see you go. If this was a mistake or if you need to rebook, please visit our website or contact us directly. We hope to see you again soon.</p>`
    },
    ride_completion: {
        subject: 'Your Ride is Complete - Receipt for Booking #{{booking_id}}',
        body: `<h2>Thank You for Riding With Us!</h2>
<p>Hi {{customer_name}},</p>
<p>Your ride with <strong>{{company_name}}</strong> is complete. Here is a summary of your trip:</p>
<table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
    <tr><td style="padding: 8px; border-bottom: 1px solid #ddd;">Booking ID:</td><td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">#{{booking_id}}</td></tr>
    <tr><td style="padding: 8px; border-bottom: 1px solid #ddd;">From:</td><td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">{{pickup}}</td></tr>
    <tr><td style="padding: 8px; border-bottom: 1px solid #ddd;">To:</td><td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">{{dropoff}}</td></tr>
    <tr><td style="padding: 8px; border-bottom: 1px solid #ddd;">Driver:</td><td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">{{driver_name}}</td></tr>
    <tr style="font-weight: bold; font-size: 1.1em;"><td style="padding: 12px 8px 8px;">Total Charged:</td><td style="padding: 12px 8px 8px; text-align: right;">\${{amount}}</td></tr>
</table>
<p>We appreciate your business and hope you had a pleasant journey! We'd love to hear your feedback.</p>`
    },
    driver_payment_notification: {
        subject: 'Payment Information for Ride #{{booking_id}}',
        body: `<h2>Payment Information</h2>
<p>Hi {{driver_name}},</p>
<p>Please note the payment details for the completed ride:</p>
<ul style="list-style-type: none; padding: 0; margin-left: 0;">
    <li style="margin-bottom: 10px;"><strong>Ride ID:</strong> #{{booking_id}}</li>
    <li style="margin-bottom: 10px;"><strong>Fare:</strong> \${{amount}}</li>
    <li style="margin-bottom: 10px;"><strong>Payment Status:</strong> {{payment_mode}}</li>
</ul>
<p>This has been recorded in your payment history.</p>`
    }
};

const companySettingsCache = new Map<string, { company_name: string; logo_url: string | null }>();
const templateCache = new Map<string, { subject: string; body: string }>();

const getCompanySettings = async (userId: string) => {
    if (companySettingsCache.has(userId)) {
        return companySettingsCache.get(userId)!;
    }
    const { data: settings } = await supabase.from('company_settings').select('company_name').eq('uid', userId).single();
    const { data: formConfig } = await supabase.from('form_configurations').select('customizations').eq('uid', userId).single();
    
    const companyInfo = {
        company_name: settings?.company_name || 'Your Company',
        logo_url: (formConfig?.customizations as any)?.logo || null
    };
    companySettingsCache.set(userId, companyInfo);
    return companyInfo;
};

const getTemplate = async (userId: string, templateName: string): Promise<{ subject: string; body: string }> => {
    const cacheKey = `${userId}-${templateName}`;
    if (templateCache.has(cacheKey)) {
        return templateCache.get(cacheKey)!;
    }
    const { data } = await supabase.from('email_templates').select('subject, body').eq('uid', userId).eq('template_name', templateName).single();
    const template = (data && data.subject && data.body) ? data : DEFAULT_TEMPLATES[templateName];
    templateCache.set(cacheKey, template);
    return template;
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


const sendAndLogEmail = async (userId: string, recipientEmail: string, subject: string, body: string, logToDb: boolean = true) => {
    const { error: functionError } = await supabase.functions.invoke('send-email', {
        body: { uid: userId, to_email: recipientEmail, subject, html_content: body },
    });
    if (functionError) throw new Error(`Failed to send email: ${functionError.message}`);

    if (logToDb) {
        const { error: dbError } = await supabase.from('notifications').insert([{
            uid: userId, recipient_email: recipientEmail, subject: `Email Sent: ${subject}`,
            body: `An email with the subject "${subject}" was successfully sent to ${recipientEmail}.`, is_read: false,
        }]);
        if (dbError) console.error('Failed to log notification to database:', dbError);
    }
};

export const logAdminNewBookingNotification = async (userId: string, adminEmail: string, booking: Booking) => {
    const subject = `New Booking #${booking.id}`;
    const body = `You have received a new booking from <strong>${booking.customer}</strong>. <br>
                   Route: ${booking.pickup} to ${booking.dropoff || 'N/A'}. <br>
                   Amount: $${booking.amount}.`;
    
    const { error } = await supabase.from('notifications').insert([{ uid: userId, recipient_email: adminEmail, subject, body, is_read: false }]);
    if (error) console.error('Failed to log admin new booking notification:', error);
};

export const sendDriverAssignmentEmail = async (userId: string, driver: Driver, booking: Booking) => {
    if (!driver.email) return;
    const settings = await getCompanySettings(userId);
    const template = await getTemplate(userId, 'driver_assignment');
    const replacements = {
        driver_name: driver.name, booking_id: booking.id, pickup: booking.pickup, dropoff: booking.dropoff || 'N/A',
        datetime: new Date((booking.form_data as any)?.datetime || booking.created_at).toLocaleString(),
        customer_name: booking.customer, company_name: settings.company_name
    };
    const subject = replacePlaceholders(template.subject, replacements);
    const body = replacePlaceholders(template.body, replacements);
    await sendAndLogEmail(userId, driver.email, subject, createEmailTemplate(body, settings.company_name, settings.logo_url));
};

export const sendBookingCancellationEmail = async (userId: string, driver: Driver, booking: Booking) => {
    if (!driver.email) return;
    const settings = await getCompanySettings(userId);
    const template = await getTemplate(userId, 'driver_cancellation');
    const replacements = {
        driver_name: driver.name, booking_id: booking.id, pickup: booking.pickup,
        datetime: new Date((booking.form_data as any)?.datetime || booking.created_at).toLocaleString(),
        company_name: settings.company_name
    };
    const subject = replacePlaceholders(template.subject, replacements);
    const body = replacePlaceholders(template.body, replacements);
    await sendAndLogEmail(userId, driver.email, subject, createEmailTemplate(body, settings.company_name, settings.logo_url));
};

export const sendUpcomingTripReminderEmail = async (userId: string, driver: Driver, booking: Booking) => {
    if (!driver.email) return;
    const settings = await getCompanySettings(userId);
    const template = await getTemplate(userId, 'driver_assignment'); // Re-using for now, can be separated
    const replacements = {
        driver_name: driver.name, booking_id: booking.id, pickup: booking.pickup, dropoff: booking.dropoff || 'N/A',
        datetime: new Date((booking.form_data as any)?.datetime || booking.created_at).toLocaleString(),
        customer_name: booking.customer, company_name: settings.company_name
    };
    const subject = `Reminder: Upcoming Ride for Booking #${booking.id}`;
    const body = replacePlaceholders(template.body, replacements);
    await sendAndLogEmail(userId, driver.email, subject, createEmailTemplate(body, settings.company_name, settings.logo_url));
};

export const sendPaymentModeEmail = async (userId: string, driver: Driver, booking: Booking, paymentMode: 'Cash' | 'Paid Online') => {
    if (!driver.email) return;
    const settings = await getCompanySettings(userId);
    const template = await getTemplate(userId, 'driver_payment_notification');
    const replacements = {
        driver_name: driver.name, booking_id: booking.id, amount: booking.amount,
        payment_mode: paymentMode, company_name: settings.company_name
    };
    const subject = replacePlaceholders(template.subject, replacements);
    const body = replacePlaceholders(template.body, replacements);
    await sendAndLogEmail(userId, driver.email, subject, createEmailTemplate(body, settings.company_name, settings.logo_url));
};

export const sendCancellationToCustomer = async (userId: string, booking: Booking) => {
    const customerEmail = (booking.form_data as any)?.email;
    if (!customerEmail) return;
    const settings = await getCompanySettings(userId);
    const template = await getTemplate(userId, 'customer_cancellation');
    const replacements = {
        customer_name: booking.customer, booking_id: booking.id, pickup: booking.pickup, company_name: settings.company_name
    };
    const subject = replacePlaceholders(template.subject, replacements);
    const body = replacePlaceholders(template.body, replacements);
    await sendAndLogEmail(userId, customerEmail, subject, createEmailTemplate(body, settings.company_name, settings.logo_url));
};

export const sendRideCompletionToCustomer = async (userId: string, booking: Booking) => {
    const customerEmail = (booking.form_data as any)?.email;
    if (!customerEmail) return;
    const settings = await getCompanySettings(userId);
    const template = await getTemplate(userId, 'ride_completion');
    const replacements = {
        customer_name: booking.customer, booking_id: booking.id, pickup: booking.pickup, dropoff: booking.dropoff || 'N/A',
        driver_name: booking.driver, amount: booking.amount, company_name: settings.company_name
    };
    const subject = replacePlaceholders(template.subject, replacements);
    const body = replacePlaceholders(template.body, replacements);
    await sendAndLogEmail(userId, customerEmail, subject, createEmailTemplate(body, settings.company_name, settings.logo_url));
};

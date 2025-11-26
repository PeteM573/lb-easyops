import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { sendReminderEmail } from '@/lib/email';

// Initialize Supabase Admin Client (Service Role)
// We need this to bypass RLS and potentially fetch user emails
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export const dynamic = 'force-dynamic'; // Ensure this doesn't get statically cached

export async function GET() {
    try {
        console.log('📅 Checking for upcoming reminders...');

        // 1. Calculate date range (Today to 7 days from now)
        const today = new Date();
        const nextWeek = new Date();
        nextWeek.setDate(today.getDate() + 7);

        // Format dates for Supabase query (YYYY-MM-DD)
        const todayStr = today.toISOString().split('T')[0];
        const nextWeekStr = nextWeek.toISOString().split('T')[0];

        // 2. Query item_dates
        // Find dates that are:
        // - Within the next 7 days (or past due and not sent)
        // - notify_manager is true
        // - reminder_sent is false
        const { data: upcomingDates, error } = await supabaseAdmin
            .from('item_dates')
            .select(`
                id,
                label,
                target_date,
                items (
                    id,
                    name,
                    barcode
                )
            `)
            .lte('target_date', nextWeekStr)
            .eq('notify_manager', true)
            .eq('reminder_sent', false);

        if (error) {
            console.error('Error fetching dates:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        if (!upcomingDates || upcomingDates.length === 0) {
            console.log('✅ No upcoming reminders found.');
            return NextResponse.json({ message: 'No reminders to send', count: 0 });
        }

        console.log(`Found ${upcomingDates.length} upcoming dates.`);

        // 3. Send Emails
        // For MVP, we'll send to a configured ADMIN_EMAIL or log it.
        // In a real app, we'd fetch all users with role='manager' and email them.
        const recipient = process.env.ADMIN_EMAIL || 'manager@loudbaby.com';

        const emailPromises = upcomingDates.map(async (record) => {
            const item = record.items as any; // Type assertion for joined data
            const daysUntil = Math.ceil((new Date(record.target_date).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

            const subject = `Reminder: ${record.label} for ${item.name}`;
            const text = `
Hello Manager,

This is a reminder for the following item:

Item: ${item.name}
Event: ${record.label}
Date: ${record.target_date} (${daysUntil <= 0 ? 'Due Today/Overdue' : `In ${daysUntil} days`})

Please take necessary action.

- Loud Baby Ops
            `;

            // Send Email
            const emailResult = await sendReminderEmail({
                to: recipient,
                subject,
                text,
            });

            // 4. Update reminder_sent flag
            if (emailResult.success) {
                await supabaseAdmin
                    .from('item_dates')
                    .update({ reminder_sent: true })
                    .eq('id', record.id);
            }

            return { id: record.id, success: emailResult.success };
        });

        const results = await Promise.all(emailPromises);

        return NextResponse.json({
            message: 'Reminders processed',
            count: results.length,
            results
        });

    } catch (err: any) {
        console.error('Unexpected error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

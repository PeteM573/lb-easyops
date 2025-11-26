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
        const { data: itemDates, error: itemError } = await supabaseAdmin
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

        if (itemError) {
            console.error('Error fetching item dates:', itemError);
        }

        // 3. Query general_dates
        const { data: generalDates, error: generalError } = await supabaseAdmin
            .from('general_dates')
            .select(`
                id,
                label,
                target_date
            `)
            .lte('target_date', nextWeekStr)
            .eq('notify_manager', true)
            .eq('reminder_sent', false);

        if (generalError) {
            console.error('Error fetching general dates:', generalError);
        }

        const allReminders = [
            ...(itemDates || []).map(d => ({ ...d, type: 'item' })),
            ...(generalDates || []).map(d => ({ ...d, type: 'general', items: null }))
        ];

        if (allReminders.length === 0) {
            console.log('✅ No upcoming reminders found.');
            return NextResponse.json({ message: 'No reminders to send', count: 0 });
        }

        console.log(`Found ${allReminders.length} upcoming dates.`);

        // 4. Send Emails
        // For MVP, we'll send to a configured ADMIN_EMAIL or log it.
        // In a real app, we'd fetch all users with role='manager' and email them.
        const recipient = process.env.ADMIN_EMAIL || 'manager@loudbaby.com';

        const emailPromises = allReminders.map(async (record: any) => {
            const daysUntil = Math.ceil((new Date(record.target_date).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

            let subject = '';
            let text = '';

            if (record.type === 'item') {
                const item = record.items;
                subject = `Reminder: ${record.label} for ${item.name}`;
                text = `
Hello Manager,

This is a reminder for the following item:

Item: ${item.name}
Event: ${record.label}
Date: ${record.target_date} (${daysUntil <= 0 ? 'Due Today/Overdue' : `In ${daysUntil} days`})

Please take necessary action.

- Loud Baby Ops
                `;
            } else {
                subject = `Reminder: ${record.label}`;
                text = `
Hello Manager,

This is a general reminder:

Event: ${record.label}
Date: ${record.target_date} (${daysUntil <= 0 ? 'Due Today/Overdue' : `In ${daysUntil} days`})

Please take necessary action.

- Loud Baby Ops
                `;
            }

            // Send Email
            const emailResult = await sendReminderEmail({
                to: recipient,
                subject,
                text,
            });

            // 5. Update reminder_sent flag
            if (emailResult.success) {
                const table = record.type === 'item' ? 'item_dates' : 'general_dates';
                await supabaseAdmin
                    .from(table)
                    .update({ reminder_sent: true })
                    .eq('id', record.id);
            }

            return { id: record.id, type: record.type, success: emailResult.success };
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

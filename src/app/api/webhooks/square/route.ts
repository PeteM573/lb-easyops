import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// Create Supabase Admin client
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    }
);

// Verify Square webhook signature
function verifySignature(body: string, signature: string, webhookSecret: string): boolean {
    const hmac = crypto.createHmac('sha256', webhookSecret);
    hmac.update(body);
    const hash = hmac.digest('base64');

    return hash === signature;
}

export async function POST(req: NextRequest) {
    try {
        // Get webhook secret from environment
        const webhookSecret = process.env.SQUARE_SANDBOX_WEBHOOK_SECRET || process.env.SQUARE_WEBHOOK_SECRET;

        if (!webhookSecret) {
            console.error('Square webhook secret not configured');
            return NextResponse.json({ error: 'Configuration error' }, { status: 500 });
        }

        // Get signature from header
        const signature = req.headers.get('x-square-hmacsha256-signature');
        if (!signature) {
            console.error('Missing signature header');
            return NextResponse.json({ error: 'Missing signature' }, { status: 401 });
        }

        // Get raw body for signature verification
        const rawBody = await req.text();

        // Verify signature
        if (!verifySignature(rawBody, signature, webhookSecret)) {
            console.error('Invalid webhook signature');
            return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
        }

        // Parse body
        const body = JSON.parse(rawBody);

        // Only process order.created and order.updated events
        if (!body.type || (!body.type.includes('order.created') && !body.type.includes('order.updated'))) {
            return NextResponse.json({ message: 'Event type ignored' }, { status: 200 });
        }

        // Extract order data
        const order = body.data?.object?.order_created?.order || body.data?.object?.order_updated?.order;

        if (!order || !order.line_items) {
            return NextResponse.json({ message: 'No line items in order' }, { status: 200 });
        }

        console.log('Processing Square order:', order.id);

        // Idempotency: Check if we've already processed this order
        const { data: existingEvent } = await supabaseAdmin
            .from('webhook_events')
            .select('id')
            .eq('event_id', order.id)
            .single();

        if (existingEvent) {
            console.log('Order already processed, skipping:', order.id);
            return NextResponse.json({ message: 'Order already processed' }, { status: 200 });
        }

        // Record this webhook event for idempotency
        await supabaseAdmin
            .from('webhook_events')
            .insert({
                event_id: order.id,
                event_type: body.type,
                payload: body
            });

        // Process each line item
        for (const lineItem of order.line_items) {
            // Get variation_id (this is the SKU/barcode from Square)
            const variationId = lineItem.catalog_object_id;
            const quantity = parseFloat(lineItem.quantity) || 0;

            if (!variationId || quantity <= 0) {
                continue;
            }

            // Query items table for matching barcode with auto_deduct flag
            const { data: items, error: itemError } = await supabaseAdmin
                .from('items')
                .select('id, name, barcode, is_auto_deduct, stock_quantity, cost_per_unit')
                .eq('barcode', variationId)
                .eq('is_auto_deduct', true);

            if (itemError) {
                console.error('Error querying items:', itemError);
                continue;
            }

            if (!items || items.length === 0) {
                console.log(`No auto-deduct item found for variation_id: ${variationId}`);
                continue;
            }

            // Process each matching item (should typically be just one)
            for (const item of items) {
                console.log(`Auto-deducting ${quantity} of ${item.name}`);

                // Calculate new stock
                const newStock = Math.max(0, item.stock_quantity - quantity);

                // 1. Update item stock
                const { error: updateError } = await supabaseAdmin
                    .from('items')
                    .update({ stock_quantity: newStock })
                    .eq('id', item.id);

                if (updateError) {
                    console.error(`Error updating stock for ${item.name}:`, updateError);
                    continue;
                }

                // 2. Also update item_locations (deduct from default location or first available)
                const { data: locationStock } = await supabaseAdmin
                    .from('item_locations')
                    .select('id, location_id, quantity')
                    .eq('item_id', item.id)
                    .gt('quantity', 0)
                    .order('quantity', { ascending: false })
                    .limit(1);

                if (locationStock && locationStock.length > 0) {
                    const locStock = locationStock[0];
                    const newLocQty = Math.max(0, locStock.quantity - quantity);

                    await supabaseAdmin
                        .from('item_locations')
                        .update({ quantity: newLocQty })
                        .eq('id', locStock.id);
                }

                // 3. Log to audit log
                await supabaseAdmin
                    .from('inventory_log')
                    .insert({
                        item_id: item.id,
                        change_type: 'SALE',
                        quantity_change: -quantity,
                        unit_cost_at_time: item.cost_per_unit || 0,
                        user_id: null, // Automatic system deduction
                        notes: `Auto-deducted from Square order ${order.id}`
                    });

                console.log(`Successfully auto-deducted ${item.name}`);
            }
        }

        return NextResponse.json({ success: true, message: 'Webhook processed' }, { status: 200 });
    } catch (error) {
        console.error('Error processing Square webhook:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

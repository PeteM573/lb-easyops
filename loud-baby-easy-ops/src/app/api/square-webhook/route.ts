// src/app/api/square-webhook/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import crypto from 'crypto';

// This function handles incoming POST requests from Square
export async function POST(request: NextRequest) {
  try {
    // 1. --- SIGNATURE VALIDATION ---
    // Get the signature from the request headers
    const signature = request.headers.get('x-square-signature');
    const requestTimestamp = request.headers.get('x-square-request-timestamp');

    if (!signature || !requestTimestamp) {
      console.warn("Square Webhook: Missing signature or timestamp.");
      return NextResponse.json({ error: 'Missing required headers' }, { status: 400 });
    }

    // Get the raw request body as text
    const rawBody = await request.text();

    // Create the string to be signed
    const stringToSign = `${requestTimestamp}${rawBody}`;
    
    // Get our webhook secret from environment variables
    const webhookSecret = process.env.SQUARE_WEBHOOK_SECRET;
    if (!webhookSecret) {
        console.error("Square Webhook: SQUARE_WEBHOOK_SECRET is not set.");
        return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    // Generate our expected signature
    const hmac = crypto.createHmac('sha256', webhookSecret);
    hmac.update(stringToSign);
    const expectedSignature = hmac.digest('base64');

    // Compare signatures
    if (signature !== expectedSignature) {
      console.warn("Square Webhook: Invalid signature.");
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // --- SIGNATURE IS VALID, PROCEED ---
    console.log("Square Webhook: Signature validated successfully.");
    const event = JSON.parse(rawBody);

    // 2. --- PROCESS THE EVENT ---
    // We only care about completed payment events
    if (event.type === 'payment.updated' && event.data.object.payment.status === 'COMPLETED') {
        const payment = event.data.object.payment;
        const orderId = payment.order_id;

        if (!orderId) {
            console.log("Square Webhook: Payment has no associated order ID. Ignoring.");
            return NextResponse.json({ success: true, message: 'No order ID, ignored.' });
        }
        
        // In a real app, you would use the Square Orders API to get order details.
        // For this prototype, we'll simulate that we received the order data and
        // that a "Baby Jacket (S)" was sold.
        
        console.log(`Square Webhook: Order ${orderId} completed. Simulating stock deduction for 'Baby Jacket (S)'.`);
        
        // 3. --- UPDATE THE DATABASE ---
        // Find the "Baby Jacket (S)" item in our database
        const { data: item, error: fetchError } = await supabase
            .from('items')
            .select('id, stock_quantity')
            .eq('name', 'Baby Jacket (S)')
            .single();
            
        if (fetchError || !item) {
            console.error("Square Webhook: Could not find 'Baby Jacket (S)' in the database.", fetchError);
            // Still return success to Square, as the webhook itself was valid.
            return NextResponse.json({ success: true, message: 'Item not found in DB.' });
        }
        
        // Decrement the stock quantity by 1
        const newQuantity = item.stock_quantity - 1;
        
        const { error: updateError } = await supabase
            .from('items')
            .update({ stock_quantity: newQuantity })
            .eq('id', item.id);
            
        if (updateError) {
            console.error("Square Webhook: Failed to update stock quantity.", updateError);
            // Still return success to Square.
            return NextResponse.json({ success: true, message: 'DB update failed.' });
        }
        
        console.log(`Square Webhook: Successfully updated 'Baby Jacket (S)' stock to ${newQuantity}.`);
    }

    // 4. --- RESPOND TO SQUARE ---
    // Always respond with a 200 OK to let Square know we received the event.
    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error("Square Webhook: An unexpected error occurred.", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
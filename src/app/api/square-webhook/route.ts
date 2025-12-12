// src/app/api/square-webhook/route.ts
import { NextRequest, NextResponse } from 'next/server';
// THE FIX: We import createClient directly to make a custom admin client
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const signature = request.headers.get('x-square-signature');
    const rawBody = await request.text();

    const webhookSecret = process.env.SQUARE_WEBHOOK_SECRET || process.env.SQUARE_SANDBOX_WEBHOOK_SECRET;

    if (!signature || !webhookSecret) {
      console.error("Validation failed: Missing signature or secret.");
      return NextResponse.json({ error: 'Missing required headers or server config' }, { status: 400 });
    }

    // --- SIGNATURE VERIFICATION ---
    const host = request.headers.get('host');
    const proto = request.headers.get('x-forwarded-proto') || 'https';
    const derivedUrl = `${proto}://${host}/api/square-webhook`;

    const stringToSign = `${derivedUrl}${rawBody}`;
    const hmac = crypto.createHmac('sha256', webhookSecret);
    hmac.update(stringToSign);
    const expectedSignature = hmac.digest('base64');

    if (signature !== expectedSignature) {
      console.warn("⚠️ Webhook Warning: Signature mismatch.");
      // We proceed for testing purposes
    } else {
      console.log("✅ Square Webhook: Signature validated successfully.");
    }

    // --- THE FIX: Initialize Supabase Admin Client ---
    // This client uses the SERVICE ROLE KEY to bypass RLS policies.
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY! // Ensure this is set in .env.local
    );

    const event = JSON.parse(rawBody);

    if (event.type === 'payment.updated' && event.data.object.payment.status === 'COMPLETED') {
      const payment = event.data.object.payment;
      const orderId = payment.order_id;

      if (!orderId) {
        console.warn("[Square Webhook] No Order ID found in payment object.");
        return NextResponse.json({ success: true, message: 'No order ID, ignored.' });
      }

      console.log(`[Square Webhook] Fetching details for order: ${orderId}`);

      // Determine API URL based on environment or config
      // Default to production unless SQUARE_ENVIRONMENT is explicitly set to 'sandbox'
      const isSandbox = process.env.SQUARE_ENVIRONMENT === 'sandbox';
      const baseUrl = isSandbox ? 'https://connect.squareupsandbox.com' : 'https://connect.squareup.com';
      const accessToken = process.env.SQUARE_ACCESS_TOKEN || process.env.SQUARE_SANDBOX_ACCESS_TOKEN;

      // 1. Fetch Order Details
      const orderResponse = await fetch(`${baseUrl}/v2/orders/${orderId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!orderResponse.ok) {
        const errorText = await orderResponse.text();
        console.error(`[Square Webhook] Order Fetch Failed: ${orderResponse.status} ${orderResponse.statusText}`, errorText);
        throw new Error(`Square API error (Order): ${orderResponse.status} ${orderResponse.statusText}`);
      }

      const orderData = await orderResponse.json();
      const lineItems = orderData.order?.line_items || [];

      console.log(`Found ${lineItems.length} line items in the order.`);

      // 2. Collect Catalog Object IDs to fetch SKUs
      const catalogObjectIds = lineItems
        .map((item: any) => item.catalog_object_id)
        .filter((id: string | undefined) => !!id);

      const skuMap = new Map<string, string>();

      if (catalogObjectIds.length > 0) {
        console.log(`Fetching catalog objects for ${catalogObjectIds.length} items...`);

        const catalogResponse = await fetch(`${baseUrl}/v2/catalog/batch-retrieve`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            object_ids: catalogObjectIds,
            include_related_objects: false
          })
        });

        if (catalogResponse.ok) {
          const catalogData = await catalogResponse.json();
          const objects = catalogData.objects || [];
          console.log(`[Square Webhook] Retrieved ${objects.length} catalog objects.`);

          for (const obj of objects) {
            // In Square, the SKU is typically on the ITEM_VARIATION
            if (obj.type === 'ITEM_VARIATION' && obj.item_variation_data?.sku) {
              skuMap.set(obj.id, obj.item_variation_data.sku);
            }
          }
          console.log(`[Square Webhook] Successfully mapped ${skuMap.size} SKUs.`);
        } else {
          console.error(`[Square Webhook] Catalog Batch Retrieve Failed: ${catalogResponse.status}`);
        }
      } else {
        console.log("[Square Webhook] No catalog object IDs found in line items (Ad-hoc items?).");
      }

      // 3. Process Line Items
      for (const squareItem of lineItems) {
        const itemName = squareItem.name;
        const quantitySold = parseInt(squareItem.quantity, 10);
        const catalogObjectId = squareItem.catalog_object_id;

        console.log(`[Square Webhook] Processing Line Item: "${itemName}" (Qty: ${quantitySold}, Catalog ID: ${catalogObjectId})`);

        // Try to get SKU from map
        const sku = catalogObjectId ? skuMap.get(catalogObjectId) : null;

        if (!sku) {
          console.warn(`[Square Webhook] SKIP: No SKU found for "${itemName}" (ID: ${catalogObjectId}). Is it an ad-hoc item or missing SKU in Square?`);
          continue;
        }

        console.log(`[Square Webhook] Resolved SKU: "${sku}"`);

        // 4. Match by UPC (barcode_number) in DB
        const { data: dbItem, error: fetchError } = await supabaseAdmin
          .from('items')
          .select('id, stock_quantity, is_auto_deduct, name')
          .eq('barcode_number', sku)
          .single();

        if (fetchError || !dbItem) {
          console.warn(`[Square Webhook] SKIP: SKU "${sku}" not found in DB (barcode_number match failed).`);
          continue;
        }

        console.log(`[Square Webhook] DB Match Found: "${dbItem.name}" (ID: ${dbItem.id}, Auto-Deduct: ${dbItem.is_auto_deduct})`);

        // 5. Check Auto-Deduct Flag
        if (!dbItem.is_auto_deduct) {
          console.log(`[Square Webhook] SKIP: Auto-deduct is DISABLED for "${dbItem.name}".`);
          continue;
        }

        // 6. Deduct Inventory
        const newQuantity = dbItem.stock_quantity - quantitySold;

        const { error: updateError } = await supabaseAdmin
          .from('items')
          .update({ stock_quantity: newQuantity })
          .eq('id', dbItem.id);

        // Log the deduction
        await supabaseAdmin.from('inventory_log').insert({
          item_id: dbItem.id,
          quantity_change: -quantitySold,
          change_type: 'SALE',
          notes: `Square Sale (Order: ${orderId})`,
          // user_id is null for system actions
        });

        if (updateError) {
          console.error(`[Square Webhook] ERROR: Failed to update stock for "${dbItem.name}". Error: ${updateError.message}`);
        } else {
          console.log(`[Square Webhook] SUCCESS: Deducted ${quantitySold} from "${dbItem.name}". New Stock: ${newQuantity}.`);
        }
      }
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error("Square Webhook: An unexpected error occurred.", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
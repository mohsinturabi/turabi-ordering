import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { generateInvoiceForOrder } from '@/lib/invoice';

// Phase 5 — step 2 of the online payment flow.
export async function POST(req: Request) {
  try {
    const {
      orderId,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = await req.json();

    if (!orderId || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json({ success: false, error: 'Missing fields' }, { status: 400 });
    }

    const { data: order, error: orderErr } = await supabaseAdmin
      .from('orders')
      .select('id, tenant_id')
      .eq('id', orderId)
      .maybeSingle();

    if (orderErr || !order) {
      return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
    }

    const { data: tenant, error: tenantErr } = await supabaseAdmin
      .from('restaurants')
      .select('razorpay_key_secret')
      .eq('id', order.tenant_id)
      .maybeSingle();

    if (tenantErr || !tenant?.razorpay_key_secret) {
      return NextResponse.json({ success: false, error: 'Payment not configured' }, { status: 400 });
    }

    const expectedSignature = crypto
      .createHmac('sha256', tenant.razorpay_key_secret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return NextResponse.json({ success: false, error: 'Signature mismatch' }, { status: 400 });
    }

    const { error: updateErr } = await supabaseAdmin
      .from('orders')
      .update({ payment_status: 'paid', razorpay_payment_id })
      .eq('id', orderId);

    if (updateErr) {
      return NextResponse.json({ success: false, error: updateErr.message }, { status: 500 });
    }

    let invoiceUrl: string | null = null;
try {
  const invoiceResult = await generateInvoiceForOrder(orderId);
  if (invoiceResult.error) {
    console.error('invoice generation failed:', invoiceResult.error);
  } else {
    invoiceUrl = invoiceResult.url;
    console.log('invoice generated successfully:', invoiceUrl);
  }
} catch (err) {
  console.error('invoice generation threw an exception:', err);
}

return NextResponse.json({ success: true, invoiceUrl });
  } catch (err) {
    console.error('razorpay/verify failed', err);
    return NextResponse.json({ success: false, error: 'Verification failed' }, { status: 500 });
  }
}
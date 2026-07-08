import { NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import { supabaseAdmin } from '@/lib/supabase-admin';

// Phase 5 — step 1 of the online payment flow.
//
// The customer app calls this AFTER an order row already exists
// (status: Pending, payment_status: unpaid). We never trust an amount
// sent from the browser: we look up the order's real total_amount
// in the database and use that.
export async function POST(req: Request) {
  try {
    const { orderId } = await req.json();

    if (!orderId) {
      return NextResponse.json({ error: 'orderId is required' }, { status: 400 });
    }

    // 1. Load the order and confirm it isn't already paid.
    const { data: order, error: orderErr } = await supabaseAdmin
      .from('orders')
      .select('id, tenant_id, order_code, total_amount, payment_status')
      .eq('id', orderId)
      .maybeSingle();

    if (orderErr || !order) {
      // eslint-disable-next-line no-console
      console.error('create-order lookup failed:', { orderId, orderErr, order });
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }
    if (order.payment_status === 'paid') {
      return NextResponse.json({ error: 'Order is already paid' }, { status: 400 });
    }

    // 2. Load this tenant's own Razorpay keys (white-label — each restaurant
    //    charges through its own Razorpay account).
    const { data: tenant, error: tenantErr } = await supabaseAdmin
      .from('restaurants')
      .select('razorpay_key_id, razorpay_key_secret')
      .eq('id', order.tenant_id)
      .maybeSingle();

    if (tenantErr || !tenant?.razorpay_key_id || !tenant?.razorpay_key_secret) {
      // eslint-disable-next-line no-console
      console.error('razorpay keys missing for tenant:', { tenantId: order.tenant_id, tenantErr, tenant });
      return NextResponse.json(
        { error: 'Online payment is not set up for this restaurant yet.' },
        { status: 400 }
      );
    }

    // 3. Ask Razorpay to create an order using THIS tenant's keys.
    const razorpay = new Razorpay({
      key_id: tenant.razorpay_key_id,
      key_secret: tenant.razorpay_key_secret,
    });

    const razorpayOrder = await razorpay.orders.create({
      amount: Math.round(order.total_amount * 100), // rupees -> paise
      currency: 'INR',
      receipt: order.order_code,
      notes: { internal_order_id: order.id },
    });

    return NextResponse.json({
      razorpayOrderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      keyId: tenant.razorpay_key_id, // safe to send to the browser
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('razorpay/create-order failed', err);
    return NextResponse.json({ error: 'Could not start payment. Please try again.' }, { status: 500 });
  }
}
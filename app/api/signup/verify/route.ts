import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const {
      restaurantId,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = await req.json();

    if (!restaurantId || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json({ success: false, error: 'Missing fields' }, { status: 400 });
    }

    const keySecret = process.env.PLATFORM_RAZORPAY_KEY_SECRET!;

    // Verify Razorpay signature
    const expectedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    const expectedBuffer = Buffer.from(expectedSignature);
    const receivedBuffer = Buffer.from(razorpay_signature);

    const isValidSignature =
      expectedBuffer.length === receivedBuffer.length &&
      crypto.timingSafeEqual(expectedBuffer, receivedBuffer);

    if (!isValidSignature) {
      console.error('Signature mismatch for order:', razorpay_order_id);
      return NextResponse.json({ success: false, error: 'Signature mismatch' }, { status: 400 });
    }

    // OPTIONAL BUT RECOMMENDED: Verify this order actually belongs to this restaurant.
    // Uncomment once you have a table (e.g. "payment_orders") that records
    // razorpay_order_id -> restaurant_id when the order was first created.
    //
    // const { data: orderRecord, error: orderErr } = await supabaseAdmin
    //   .from('payment_orders')
    //   .select('restaurant_id')
    //   .eq('razorpay_order_id', razorpay_order_id)
    //   .single();
    //
    // if (orderErr || !orderRecord || orderRecord.restaurant_id !== restaurantId) {
    //   console.error('Order/restaurant mismatch:', { razorpay_order_id, restaurantId });
    //   return NextResponse.json({ success: false, error: 'Invalid order' }, { status: 400 });
    // }

    // Mark subscription active
    const { error: updateErr } = await supabaseAdmin
      .from('restaurants')
      .update({ subscription_status: 'active' })
      .eq('id', restaurantId);

    if (updateErr) {
      console.error('Failed to update subscription status:', updateErr);
      return NextResponse.json({ success: false, error: 'Could not activate subscription' }, { status: 500 });
    }

    // Fetch restaurant to send the invite email
    const { data: restaurant, error: fetchErr } = await supabaseAdmin
      .from('restaurants')
      .select('id, contact_email')
      .eq('id', restaurantId)
      .single();

    if (fetchErr || !restaurant) {
      console.error('Could not fetch restaurant after activation:', fetchErr);
      // Payment already succeeded and status is active — don't fail the request,
      // just flag that the invite couldn't be sent.
      return NextResponse.json({
        success: true,
        warning: 'Payment verified, but invite email could not be sent. Use resend invite.',
      });
    }

    const { error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      restaurant.contact_email,
      {
        data: { restaurant_id: restaurant.id, role: 'owner' },
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/reset-password`,
      }
    );

    if (inviteError) {
      console.error('Invite email failed after payment verification:', inviteError);

      // If user already exists, try a recovery/set-password link instead
      const alreadyRegistered = /already registered/i.test(inviteError.message);

      if (alreadyRegistered) {
        const { error: recoveryError } = await supabaseAdmin.auth.resetPasswordForEmail(
          restaurant.contact_email,
          { redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/reset-password` }
        );

        if (recoveryError) {
          console.error('Recovery email also failed:', recoveryError);
          return NextResponse.json({
            success: true,
            warning: 'Payment verified, but email could not be sent. Use resend invite.',
          });
        }
      } else {
        return NextResponse.json({
          success: true,
          warning: 'Payment verified, but invite email could not be sent. Use resend invite.',
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Unexpected error in verify-signup-payment:', err);
    return NextResponse.json({ success: false, error: 'Something went wrong' }, { status: 500 });
  }
}

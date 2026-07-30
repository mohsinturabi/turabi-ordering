import { NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const RENEWAL_FEE = 599;

export async function POST(req: Request) {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      restaurantId,
    } = await req.json();

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !restaurantId) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const body = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.PLATFORM_RAZORPAY_KEY_SECRET!)
      .update(body)
      .digest("hex");

    const expectedBuffer = Buffer.from(expectedSignature);
    const receivedBuffer = Buffer.from(razorpay_signature);

    const isValidSignature =
      expectedBuffer.length === receivedBuffer.length &&
      crypto.timingSafeEqual(expectedBuffer, receivedBuffer);

    if (!isValidSignature) {
      console.error("Signature mismatch for renewal order:", razorpay_order_id);
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    // Renewal always extends 28 days from whichever is later — "now" or the
    // current subscription_end. This means renewing early doesn't lose the
    // days already paid for; it stacks on top.
    const { data: current, error: fetchErr } = await supabaseAdmin
      .from("restaurants")
      .select("subscription_end")
      .eq("id", restaurantId)
      .single();

    if (fetchErr || !current) {
      return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
    }

    const now = new Date();
    const currentEnd = current.subscription_end ? new Date(current.subscription_end) : now;
    const base = currentEnd > now ? currentEnd : now;
    const newExpiry = new Date(base);
    newExpiry.setDate(newExpiry.getDate() + 28);

    const { data: restaurant, error: updateError } = await supabaseAdmin
      .from("restaurants")
      .update({
        subscription_status: "active",
        plan_type: "full",
        subscription_end: newExpiry.toISOString(),
        next_billing_date: newExpiry.toISOString(),
        last_payment_date: now.toISOString(),
      })
      .eq("id", restaurantId)
      .select()
      .single();

    if (updateError || !restaurant) {
      console.error("Failed to update subscription on renewal:", updateError);
      return NextResponse.json({ error: "Could not update subscription" }, { status: 500 });
    }

    await supabaseAdmin.from("payment_history").insert({
      restaurant_id: restaurantId,
      payment_type: "renewal",
      amount: RENEWAL_FEE,
      razorpay_payment_id,
      razorpay_order_id,
      status: "paid",
    });

    return NextResponse.json({ success: true, restaurant });
  } catch (err: any) {
    console.error("verify-renewal-payment failed:", err);
    return NextResponse.json({ error: err.message || "Something went wrong" }, { status: 500 });
  }
}
